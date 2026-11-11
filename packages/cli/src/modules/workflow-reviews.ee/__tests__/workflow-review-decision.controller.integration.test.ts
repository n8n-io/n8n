import { linkUserToProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createAdmin, createUser } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
	REVIEW_TABLES,
	seedReview,
	seedReviewActors,
	stubWorkflowValidation,
	versionUpdatePayload,
} from './support/workflow-review-test-data';

mockInstance(ActiveWorkflowManager);
const workflowValidationService = mockInstance(WorkflowValidationService);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflow-reviews', 'workflows'],
	enabledFeatures: ['feat:workflowReviews'],
	modules: ['workflow-reviews'],
});

let owner: User;
let member: User;
let viewer: User;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let publishHistoryRepository: WorkflowPublishHistoryRepository;
let workflowEntityRepository: WorkflowRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	publishHistoryRepository = Container.get(WorkflowPublishHistoryRepository);
	workflowEntityRepository = Container.get(WorkflowRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, viewer, teamProject, ownerAgent, memberAgent, viewerAgent } =
		await seedReviewActors(testServer.authAgentFor));
});

/** Seed a review on a team-project workflow, authored by `author`. */
async function seedRequest(
	author: User,
	overrides: {
		state?: 'open' | 'closed';
		decision?: 'pending' | 'changes_requested' | 'approved';
	} = {},
	reviewerIds: string[] = [member.id],
) {
	const { workflow } = await createReviewableWorkflow(teamProject, { versionId: 'version-1' });
	const request = await seedReview({
		projectId: teamProject.id,
		workflowId: workflow.id,
		versionId: 'version-1',
		author,
		reviewerIds,
		title: 'Review me',
		...overrides,
	});
	return { request, workflow };
}

const decide = (agent: SuperAgentTest, requestId: string, body: object) =>
	agent.post(`/workflow-review-requests/${requestId}/decision`).send(body);

const approve = (agent: SuperAgentTest, requestId: string) =>
	decide(agent, requestId, { decision: 'approved' });

const requestChanges = (agent: SuperAgentTest, requestId: string) =>
	decide(agent, requestId, { decision: 'changes_requested', note: 'Please rename the node' });

const publishedVersionOf = async (workflowId: string) =>
	(await workflowEntityRepository.findOneByOrFail({ id: workflowId })).activeVersionId;

describe('POST /workflow-review-requests/:workflowReviewRequestId/decision', () => {
	test('closes the review on approval, recording who approved it and when', async () => {
		const { request } = await seedRequest(owner);
		const seededUpdatedAt = request.updatedAt.getTime();

		const response = await approve(memberAgent, request.id).expect(200);

		expect(response.body.data).toEqual({
			id: request.id,
			state: 'closed',
			decision: 'approved',
			workflowVersionId: 'version-1',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			autoPublish: { status: 'published' },
		});

		// the service relies on `save` (not `update`) so @BeforeUpdate bumps
		// updatedAt — assert the timestamp actually moves.
		expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(seededUpdatedAt);

		const updated = await requestRepository.findById(request.id, {});
		expect(updated).toMatchObject({
			state: 'closed',
			decision: 'approved',
			updatedById: member.id,
			closedById: member.id,
		});
		expect(updated?.approvedAt).toBeInstanceOf(Date);
	});

	test('publishes the approved version as the requester, not as the reviewer', async () => {
		const { request, workflow } = await seedRequest(owner);

		await approve(memberAgent, request.id).expect(200);

		expect(await publishedVersionOf(workflow.id)).toBe('version-1');
		// Publish history must record the requester, not the approving reviewer.
		const records = await publishHistoryRepository.findBy({ workflowId: workflow.id });
		expect(records).toEqual([
			expect.objectContaining({ event: 'activated', versionId: 'version-1', userId: owner.id }),
		]);
	});

	test('closes as the system and reports the failure when the requester is gone', async () => {
		const { request, workflow } = await seedRequest(owner);
		const current = await requestRepository.findById(request.id, {});
		current!.createdById = null;
		await requestRepository.saveRequest(current!, {});

		const response = await approve(memberAgent, request.id).expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: {
				status: 'failed',
				message: 'The review requester is no longer available',
			},
		});
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
			closedById: null,
			updatedById: member.id,
		});
		expect(await publishedVersionOf(workflow.id)).toBeNull();
	});

	test('closes as the system and reports the failure when the requester can no longer publish', async () => {
		const demotedRequester = await createUser();
		await linkUserToProject(demotedRequester, teamProject, 'project:editor');
		const { request, workflow } = await seedRequest(demotedRequester);
		// Downgrade after the review was opened — they can no longer publish.
		await linkUserToProject(demotedRequester, teamProject, 'project:viewer');

		const response = await approve(memberAgent, request.id).expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: {
				status: 'failed',
				message: 'The review requester no longer has permission to publish this workflow',
			},
		});
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
			closedById: null,
		});
		expect(await publishedVersionOf(workflow.id)).toBeNull();
	});

	test('leaves the review open, unstamped and unpublished when a reviewer asks for changes', async () => {
		const { request, workflow } = await seedRequest(owner);

		const response = await requestChanges(memberAgent, request.id).expect(200);

		expect(response.body.data).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
		});
		expect(response.body.data.autoPublish).toBeUndefined();
		expect(await publishedVersionOf(workflow.id)).toBeNull();

		const updated = await requestRepository.findById(request.id, {});
		expect(updated).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
			updatedById: member.id,
			closedById: null,
			approvedAt: null,
		});
	});

	test('lets a reviewer approve a review that had changes requested', async () => {
		const { request } = await seedRequest(owner, { decision: 'changes_requested' });

		await approve(memberAgent, request.id).expect(200);

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
		});
	});

	test('lets a second reviewer ask for changes again', async () => {
		const { request } = await seedRequest(owner, { decision: 'changes_requested' });

		await requestChanges(memberAgent, request.id).expect(200);

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
			updatedById: member.id,
		});
	});

	test('refuses an author deciding their own review', async () => {
		const { request } = await seedRequest(member, {}, [owner.id]);

		await approve(memberAgent, request.id).expect(403);

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'open',
			decision: 'pending',
		});
	});

	test('lets a reviewer decide after they submit a new version themselves', async () => {
		const { request, workflow } = await seedRequest(owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		await memberAgent
			.post(`/workflow-review-requests/${request.id}/update-version`)
			.send(versionUpdatePayload({ workflowId: workflow.id, versionId: 'version-2' }))
			.expect(200);

		await approve(memberAgent, request.id).expect(200);
	});

	test('lets the instance owner decide their own review', async () => {
		const { request } = await seedRequest(owner);

		await approve(ownerAgent, request.id).expect(200);
	});

	test('lets an instance admin decide their own review', async () => {
		const admin = await createAdmin();
		const { request } = await seedRequest(admin);

		await approve(testServer.authAgentFor(admin), request.id).expect(200);
	});

	test('lets a project admin decide their own review in that project', async () => {
		const projectAdmin = await createUser();
		await linkUserToProject(projectAdmin, teamProject, 'project:admin');
		const { request } = await seedRequest(projectAdmin);

		await approve(testServer.authAgentFor(projectAdmin), request.id).expect(200);
	});

	test('hides a review from someone who was not asked to review it', async () => {
		const { request } = await seedRequest(owner, {}, []);

		const response = await approve(memberAgent, request.id).expect(404);

		// Same wording as an unknown id, so the refusal doesn't reveal the review exists.
		expect(response.body.message).toBe('Could not find review request');
	});

	test('lets someone who can only view the workflow decide when asked to review', async () => {
		const { request } = await seedRequest(owner, {}, [viewer.id]);

		await requestChanges(viewerAgent, request.id).expect(200);

		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'open',
			decision: 'changes_requested',
			updatedById: viewer.id,
		});
	});

	test('lets a reviewer who can only view the workflow approve, publishing as the requester', async () => {
		// The decider holds workflow:read only, so publishing can only work
		// because it runs as the requester.
		const { request, workflow } = await seedRequest(owner, {}, [viewer.id]);

		const response = await approve(viewerAgent, request.id).expect(200);

		expect(response.body.data).toMatchObject({
			state: 'closed',
			decision: 'approved',
			autoPublish: { status: 'published' },
		});
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
			updatedById: viewer.id,
			closedById: viewer.id,
		});
		expect(await publishedVersionOf(workflow.id)).toBe('version-1');
		const records = await publishHistoryRepository.findBy({ workflowId: workflow.id });
		expect(records).toEqual([
			expect.objectContaining({ event: 'activated', versionId: 'version-1', userId: owner.id }),
		]);
	});

	test('hides a review that does not exist', async () => {
		const response = await approve(memberAgent, 'unknown-request').expect(404);

		expect(response.body.message).toBe('Could not find review request');
	});

	test('refuses to re-pin a closed review', async () => {
		const { request } = await seedRequest(owner, { state: 'closed' });

		await approve(memberAgent, request.id).expect(409);
	});

	test('refuses a second decision on an approved review', async () => {
		const { request } = await seedRequest(owner, { decision: 'approved' });

		await decide(memberAgent, request.id, { decision: 'changes_requested' }).expect(409);
	});

	test('refuses everything once an admin turns reviews off', async () => {
		const { request } = await seedRequest(owner);
		await policyService.set(false);

		await approve(memberAgent, request.id).expect(403);
	});

	test('lets only one of two simultaneous approvals win', async () => {
		const { request } = await seedRequest(owner);

		const [first, second] = await Promise.all([
			approve(memberAgent, request.id),
			approve(memberAgent, request.id),
		]);

		expect([first.status, second.status].sort()).toEqual([200, 409]);
		expect(await requestRepository.findById(request.id, {})).toMatchObject({
			state: 'closed',
			decision: 'approved',
		});
	});

	test('never leaves a closed review undecided when a re-pin races the decision', async () => {
		const { request, workflow } = await seedRequest(owner);
		await createWorkflowHistoryItem(workflow.id, { versionId: 'version-2' });

		const [decision, sync] = await Promise.all([
			approve(memberAgent, request.id),
			ownerAgent
				.post(`/workflow-review-requests/${request.id}/update-version`)
				.send(versionUpdatePayload({ workflowId: workflow.id, versionId: 'version-2' })),
		]);

		// Whichever wins the lock, the loser must observe the winner's write:
		// either the sync lands first (both 200) or it conflicts on the closed request.
		expect(decision.status).toBe(200);
		expect([200, 409]).toContain(sync.status);

		const final = await requestRepository.findById(request.id, {});
		expect(final?.state === 'closed' && final?.decision === 'pending').toBe(false);
		expect(final).toMatchObject({ state: 'closed', decision: 'approved' });
	});
});
