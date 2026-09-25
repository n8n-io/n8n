import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { UserRepository, WorkflowReviewRequestRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createMember } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
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
let ownerProject: Project;
let teamProject: Project;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let viewerAgent: SuperAgentTest;

let requestRepository: WorkflowReviewRequestRepository;
let userRepository: UserRepository;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	requestRepository = Container.get(WorkflowReviewRequestRepository);
	userRepository = Container.get(UserRepository);
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, ownerProject, teamProject, ownerAgent, memberAgent, viewerAgent } =
		await seedReviewActors(testServer.authAgentFor));
});

const listRequests = (agent: SuperAgentTest, query: Record<string, unknown>) =>
	agent.get('/workflow-review-requests').query(query);

describe('GET /workflow-review-requests', () => {
	test('returns an empty list when the workflow has no reviews', async () => {
		const { workflow } = await createReviewableWorkflow(owner);

		const response = await listRequests(ownerAgent, {
			workflowId: workflow.id,
			state: 'open',
			take: 1,
		}).expect(200);

		expect(response.body.data).toEqual({ count: 0, data: [] });
	});

	test('returns the open review as a minimal summary', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const request = await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			title: 'Confidential title',
			description: 'Confidential description',
		});

		const response = await listRequests(ownerAgent, {
			workflowId: workflow.id,
			state: 'open',
			take: 1,
		}).expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);

		expect(response.body.data.data[0]).toEqual({
			id: request.id,
			state: 'open',
			decision: 'pending',
			workflowVersionId: versionId,
			workflowVersionName: null,
			// The owner can act on the review, so the description rides along; the
			// title stays off the workflow-scoped list entirely.
			description: 'Confidential description',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			// Does not apply to a pending review
			decisionBy: null,
			viewerCanOpen: true,
		});
	});

	describe('pinned version name', () => {
		async function listPinnedVersionName(workflowId: string) {
			const response = await listRequests(ownerAgent, { workflowId, take: 1 }).expect(200);

			expect(response.body.data.data).toHaveLength(1);
			return response.body.data.data[0].workflowVersionName;
		}

		test('returns the name the pinned version was given', async () => {
			const workflow = await createWorkflow({}, owner);
			const versionId = uuid();
			await createWorkflowHistoryItem(workflow.id, { versionId, name: 'Release candidate' });
			await seedReview({
				projectId: ownerProject.id,
				workflowId: workflow.id,
				versionId,
				author: owner,
			});

			expect(await listPinnedVersionName(workflow.id)).toBe('Release candidate');
		});

		test('returns no name for an unnamed version under review', async () => {
			const { workflow, versionId } = await createReviewableWorkflow(owner);
			await seedReview({
				projectId: ownerProject.id,
				workflowId: workflow.id,
				versionId,
				author: owner,
			});

			expect(await listPinnedVersionName(workflow.id)).toBeNull();
		});
	});

	test('withholds the description from a requester who cannot act on the review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(teamProject);
		await seedReview({
			projectId: teamProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			title: 'Confidential title',
			description: 'Confidential description',
		});

		const viewerResponse = await listRequests(viewerAgent, {
			workflowId: workflow.id,
			take: 1,
		}).expect(200);
		expect(viewerResponse.body.data.data[0].description).toBeNull();

		const editorResponse = await listRequests(memberAgent, {
			workflowId: workflow.id,
			take: 1,
		}).expect(200);
		expect(editorResponse.body.data.data[0].description).toBe('Confidential description');
	});

	test('returns the newest review, closed ones included, when no state is asked for', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const older = await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			state: 'closed',
			title: 'Older',
		});
		const newest = await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			state: 'open',
			title: 'Newest',
		});
		// Both rows are created within the same millisecond, so state the age
		// explicitly instead of asserting against a timestamp tie.
		await requestRepository.update(older.id, { createdAt: new Date('2026-01-01T00:00:00.000Z') });
		await requestRepository.update(newest.id, { createdAt: new Date('2026-01-02T00:00:00.000Z') });

		const response = await listRequests(ownerAgent, { workflowId: workflow.id, take: 1 }).expect(
			200,
		);

		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0]).toMatchObject({ id: newest.id, state: 'open' });
	});

	test('names who asked for changes', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			decision: 'changes_requested',
			title: 'Needs work',
			updatedById: member.id,
		});

		const response = await listRequests(ownerAgent, { workflowId: workflow.id, take: 1 }).expect(
			200,
		);

		expect(response.body.data.data[0]).toMatchObject({
			decision: 'changes_requested',
			decisionBy: {
				id: member.id,
				email: member.email,
				firstName: member.firstName,
				lastName: member.lastName,
			},
		});
	});

	test('names nobody once the deciding user is deleted', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const reviewer = await createMember();
		await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			decision: 'changes_requested',
			title: 'Needs work',
			updatedById: reviewer.id,
		});
		await userRepository.delete(reviewer.id);

		const response = await listRequests(ownerAgent, { workflowId: workflow.id, take: 1 }).expect(
			200,
		);

		expect(response.body.data.data[0]).toMatchObject({
			decision: 'changes_requested',
			decisionBy: null,
		});
	});

	test('names nobody for an approved review', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			state: 'closed',
			decision: 'approved',
			title: 'Approved',
			updatedById: member.id,
		});

		const response = await listRequests(ownerAgent, { workflowId: workflow.id, take: 1 }).expect(
			200,
		);

		expect(response.body.data.data[0]).toMatchObject({
			state: 'closed',
			decision: 'approved',
			// Approval is never attributed in the canvas banner
			decisionBy: null,
		});
	});

	test('leaves closed reviews out of the open list, and in when no state is asked for', async () => {
		const { workflow, versionId } = await createReviewableWorkflow(owner);
		const closed = await seedReview({
			projectId: ownerProject.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			state: 'closed',
			title: 'Closed',
		});

		const openResponse = await listRequests(ownerAgent, {
			workflowId: workflow.id,
			state: 'open',
			take: 1,
		}).expect(200);
		expect(openResponse.body.data).toEqual({ count: 0, data: [] });

		const allResponse = await listRequests(ownerAgent, { workflowId: workflow.id }).expect(200);
		expect(allResponse.body.data.count).toBe(1);
		expect(allResponse.body.data.data[0]).toMatchObject({ id: closed.id, state: 'closed' });
	});

	test('does not include requests of other workflows', async () => {
		const { workflow } = await createReviewableWorkflow(owner);
		const other = await createReviewableWorkflow(owner, { versionId: 'version-other' });
		await seedReview({
			projectId: ownerProject.id,
			workflowId: other.workflow.id,
			versionId: 'version-other',
			author: owner,
			title: 'For the other workflow',
		});

		const response = await listRequests(ownerAgent, { workflowId: workflow.id }).expect(200);

		expect(response.body.data).toEqual({ count: 0, data: [] });
	});

	test('hides a workflow the caller cannot access', async () => {
		const { workflow } = await createReviewableWorkflow(owner);

		await listRequests(memberAgent, {
			workflowId: workflow.id,
			state: 'open',
			take: 1,
		}).expect(404);
	});

	test('lets someone who can only view the workflow see its reviews', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const { workflow, versionId } = await createReviewableWorkflow(project, {
			versionId: 'version-1',
		});
		const request = await seedReview({
			projectId: project.id,
			workflowId: workflow.id,
			versionId,
			author: owner,
			title: 'Open review',
		});

		const response = await listRequests(memberAgent, {
			workflowId: workflow.id,
			state: 'open',
			take: 1,
		}).expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data[0].id).toBe(request.id);
	});

	test('refuses everything once an admin turns reviews off', async () => {
		const { workflow } = await createReviewableWorkflow(owner);
		await policyService.set(false);

		await listRequests(ownerAgent, { workflowId: workflow.id }).expect(403);
	});

	// The only end-to-end proof that the `@Licensed` decorator is enforced by the
	// middleware. Its presence on every handler is asserted exhaustively against
	// the real route metadata in `workflow-review-requests.controller.test.ts`.
	test('refuses everything on an instance without a workflow reviews licence', async () => {
		testServer.license.disable('feat:workflowReviews');

		await listRequests(ownerAgent, { workflowId: 'wf-1' }).expect(403);

		testServer.license.enable('feat:workflowReviews');
	});
});
