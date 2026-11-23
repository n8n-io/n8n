import { EventService } from '@n8n/backend-services';
import {
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
	readActivityFeed,
	REVIEW_TABLES,
	seedReview,
	seedReviewActors,
	stubWorkflowValidation,
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
let activityRepository: WorkflowReviewActivityRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	activityRepository = Container.get(WorkflowReviewActivityRepository);
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

/** Seed a review on a workflow in `project`, authored by `author`. */
async function seedRequest(
	author: User,
	{
		decision,
		state,
		reviewerIds = [owner.id],
		project = teamProject,
	}: {
		decision?: 'pending' | 'changes_requested';
		state?: 'open' | 'closed';
		reviewerIds?: string[];
		project?: Project;
	} = {},
) {
	const { workflow } = await createReviewableWorkflow(project, { versionId: 'version-1' });
	const request = await seedReview({
		projectId: project.id,
		workflowId: workflow.id,
		versionId: 'version-1',
		author,
		reviewerIds,
		decision,
		state,
	});
	return { request, workflow };
}

const close = (agent: SuperAgentTest, requestId: string) =>
	agent.post(`/workflow-review-requests/${requestId}/close`);

const approve = (agent: SuperAgentTest, requestId: string) =>
	agent.post(`/workflow-review-requests/${requestId}/decision`).send({ decision: 'approved' });

const requestChanges = (agent: SuperAgentTest, requestId: string) =>
	agent
		.post(`/workflow-review-requests/${requestId}/decision`)
		.send({ decision: 'changes_requested', note: 'Please rename the node' });

const feedTypes = async (agent: SuperAgentTest, requestId: string) =>
	(await readActivityFeed(agent, requestId)).data.map((entry) => entry.type);

describe('POST /workflow-review-requests/:workflowReviewRequestId/close', () => {
	describe('the requester', () => {
		test.each([
			['in a team project', async () => await seedRequest(member)],
			[
				'in their personal space',
				async () => await seedRequest(member, { project: await getPersonalProject(member) }),
			],
			[
				'who can no longer publish the workflow',
				async () => {
					const seeded = await seedRequest(member);
					await linkUserToProject(member, teamProject, 'project:viewer');
					return seeded;
				},
			],
		])('closes their own review %s without approving it', async (_label, seed) => {
			const { request } = await seed();

			const response = await close(memberAgent, request.id).expect(200);

			expect(response.body.data).toEqual({
				id: request.id,
				state: 'closed',
				decision: 'pending',
				workflowVersionId: 'version-1',
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(await requestRepository.findById(request.id, {})).toMatchObject({
				state: 'closed',
				decision: 'pending',
				closedById: member.id,
				approvedAt: null,
			});
		});
	});

	describe('a reviewer or the owner', () => {
		test.each([
			['an assigned reviewer', async () => ({ closer: member, agent: memberAgent })],
			['an instance owner', async () => ({ closer: owner, agent: ownerAgent })],
		])('closes a review as %s', async (_label, actor) => {
			const { closer, agent } = await actor();
			const { request } = await seedRequest(viewer, { reviewerIds: [member.id] });

			await close(agent, request.id).expect(200);

			expect(await requestRepository.findById(request.id, {})).toMatchObject({
				state: 'closed',
				closedById: closer.id,
			});
		});
	});

	describe('anyone else', () => {
		test('refuses a co-author who neither requested nor reviews the review', async () => {
			const { request } = await seedRequest(member);
			await Container.get(WorkflowReviewRequestAuthorRepository).addAuthor(
				{ workflowReviewRequestId: request.id, userId: viewer.id },
				{},
			);

			const response = await close(viewerAgent, request.id).expect(403);

			expect(response.body.message).toBe(
				"You can't close this review. Ask the requester, a reviewer, or a project admin to close it.",
			);

			expect(await requestRepository.findById(request.id, {})).toMatchObject({ state: 'open' });
			expect(await feedTypes(ownerAgent, request.id)).toEqual([]);
		});

		test('hides the review from a member who takes no part in it', async () => {
			const { request } = await seedRequest(viewer);

			const response = await close(memberAgent, request.id).expect(404);

			expect(response.body.message).toBe('Could not find review request');
			expect(await requestRepository.findById(request.id, {})).toMatchObject({ state: 'open' });
			expect(await feedTypes(ownerAgent, request.id)).toEqual([]);
		});
	});

	describe('review state', () => {
		test('keeps the requested changes and who asked for them on the closed review', async () => {
			const { request } = await seedRequest(member);
			await requestChanges(ownerAgent, request.id).expect(200);

			await close(memberAgent, request.id).expect(200);

			expect(await requestRepository.findById(request.id, {})).toMatchObject({
				state: 'closed',
				decision: 'changes_requested',
				updatedById: owner.id,
				closedById: member.id,
				approvedAt: null,
			});
		});

		test('refuses to close a closed review and records nothing', async () => {
			const { request } = await seedRequest(member, { state: 'closed' });

			await close(memberAgent, request.id).expect(409);

			expect(await feedTypes(ownerAgent, request.id)).toEqual([]);
		});

		test('lets only one of a simultaneous close and approval win', async () => {
			const { request } = await seedRequest(member);

			const [closed, approved] = await Promise.all([
				close(memberAgent, request.id),
				approve(ownerAgent, request.id),
			]);

			expect([closed.status, approved.status].sort()).toEqual([200, 409]);
			const terminalEntries = (await feedTypes(ownerAgent, request.id)).filter(
				(type) => type === 'review.closed_by_user' || type === 'review.approved',
			);
			expect(terminalEntries).toHaveLength(1);
		});

		test('never overwrites a decision made while the close waited for the lock', async () => {
			const { request } = await seedRequest(member);

			const [changes, closed] = await Promise.all([
				requestChanges(ownerAgent, request.id),
				close(memberAgent, request.id),
			]);

			expect(closed.status).toBe(200);
			expect(await requestRepository.findById(request.id, {})).toMatchObject({
				state: 'closed',
				decision: changes.status === 200 ? 'changes_requested' : 'pending',
			});
		});

		test('leaves the review open when its close entry cannot be written', async () => {
			const { request } = await seedRequest(member);
			vi.spyOn(activityRepository, 'createActivity').mockRejectedValueOnce(
				new Error('write failed'),
			);

			await close(memberAgent, request.id).expect(500);

			expect(await requestRepository.findById(request.id, {})).toMatchObject({
				state: 'open',
				closedById: null,
			});
		});
	});

	describe('after the close', () => {
		test('tells open editors that the review closed', async () => {
			const { request, workflow } = await seedRequest(member);
			const broadcast = vi.spyOn(
				Container.get(CollaborationService),
				'broadcastWorkflowReviewStateChanged',
			);

			await close(memberAgent, request.id).expect(200);

			expect(broadcast).toHaveBeenCalledWith(workflow.id);
		});

		test('reports who closed the review and the version it covered', async () => {
			const { request, workflow } = await seedRequest(member);
			// Spied rather than mocked: the real container's listeners must keep running.
			const emit = vi.spyOn(Container.get(EventService), 'emit');

			await close(memberAgent, request.id).expect(200);

			expect(emit).toHaveBeenCalledWith('workflow-review-closed-by-user', {
				user: expect.objectContaining({ id: member.id }),
				workflowReviewRequestId: request.id,
				workflowId: workflow.id,
				workflowVersionId: 'version-1',
			});
			expect(emit).not.toHaveBeenCalledWith('workflow-review-closed', expect.anything());
			expect(emit).not.toHaveBeenCalledWith('workflow-review-decided', expect.anything());
		});
	});
});
