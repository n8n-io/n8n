import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const originalWorkflowReviewsFlag = process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;

const testServer = utils.setupTestServer({ endpointGroups: ['workflows'] });

const enableWorkflowReviews = async () => {
	testServer.license.enable('feat:workflowReviews');
	process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
	await Container.get(WorkflowReviewPolicyService).set(true);
};

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory', 'User']);
});

afterEach(async () => {
	await Container.get(WorkflowReviewPolicyService).set(false);
	if (originalWorkflowReviewsFlag === undefined) {
		delete process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS;
	} else {
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = originalWorkflowReviewsFlag;
	}
});

describe('GET /workflows/:workflowId/review-required', () => {
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let member: Awaited<ReturnType<typeof createMember>>;

	beforeEach(async () => {
		owner = await createOwner();
		member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	it('returns the current review-required status when the feature is enabled', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);

		const response = await ownerAgent.get(`/workflows/${workflow.id}/review-required`).expect(200);

		expect(response.body.data).toEqual({
			reviewRequired: false,
			canEdit: true,
		});
	});

	it('returns canEdit true for a personal project owner without workflow history', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflow({}, member);

		const response = await memberAgent.get(`/workflows/${workflow.id}/review-required`).expect(200);

		expect(response.body.data).toMatchObject({
			reviewRequired: false,
			canEdit: true,
		});
	});

	it('rejects with 403 when not licensed', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);

		const response = await ownerAgent.get(`/workflows/${workflow.id}/review-required`).expect(403);

		expect(response.body).toHaveProperty('message', 'Plan lacks license for this feature');
	});

	it('rejects with 403 when the dev flag is off', async () => {
		testServer.license.enable('feat:workflowReviews');
		await Container.get(WorkflowReviewPolicyService).set(true);
		const workflow = await createWorkflowWithHistory({}, owner);

		const response = await ownerAgent.get(`/workflows/${workflow.id}/review-required`).expect(403);

		expect(response.body).toHaveProperty(
			'message',
			'Workflow reviews are not available on this instance',
		);
	});

	it('rejects with 403 when the instance master switch is off', async () => {
		testServer.license.enable('feat:workflowReviews');
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		const workflow = await createWorkflowWithHistory({}, owner);

		const response = await ownerAgent.get(`/workflows/${workflow.id}/review-required`).expect(403);

		expect(response.body).toHaveProperty(
			'message',
			'Workflow reviews are not enabled on this instance',
		);
	});

	it('rejects with 401 when not authenticated', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);

		await testServer.authlessAgent.get(`/workflows/${workflow.id}/review-required`).expect(401);
	});

	it('returns 404 for a non-existent workflow', async () => {
		await enableWorkflowReviews();

		await ownerAgent.get('/workflows/non-existent/review-required').expect(404);
	});
});

describe('PATCH /workflows/:workflowId/review-required', () => {
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let member: Awaited<ReturnType<typeof createMember>>;

	beforeEach(async () => {
		owner = await createOwner();
		member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	it('updates the review-required setting and returns the new status', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);

		const response = await ownerAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(200);

		expect(response.body.data).toMatchObject({
			reviewRequired: true,
			canEdit: true,
		});

		const persisted = await Container.get(WorkflowRepository).findOneBy({ id: workflow.id });
		expect(persisted?.settings?.reviewRequired).toBe(true);
	});

	it('persists toggling review-required off after it was enabled', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({ settings: { reviewRequired: true } }, owner);

		const response = await ownerAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: false })
			.expect(200);

		expect(response.body.data.reviewRequired).toBe(false);

		const readResponse = await ownerAgent
			.get(`/workflows/${workflow.id}/review-required`)
			.expect(200);
		expect(readResponse.body.data.reviewRequired).toBe(false);
	});

	it('does not create a new workflow history version', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);
		const historyRepository = Container.get(WorkflowHistoryRepository);
		const initialHistoryCount = await historyRepository.count({
			where: { workflowId: workflow.id },
		});

		await ownerAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(200);

		const historyCount = await historyRepository.count({ where: { workflowId: workflow.id } });
		expect(historyCount).toBe(initialHistoryCount);
	});

	it('rejects a malformed request body with 400', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);

		await ownerAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: 'yes' })
			.expect(400);
	});

	it('rejects with 401 when not authenticated', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);

		await testServer.authlessAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(401);
	});

	it('allows a shared workflow editor to update review-required', async () => {
		await enableWorkflowReviews();
		const workflow = await createWorkflowWithHistory({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);

		const response = await memberAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(200);

		expect(response.body.data).toMatchObject({
			reviewRequired: true,
			canEdit: true,
		});
	});

	it('allows a team project admin to update review-required', async () => {
		await enableWorkflowReviews();
		const teamProject = await createTeamProject('Admin Team', owner);
		await linkUserToProject(member, teamProject, 'project:admin');
		const workflow = await createWorkflowWithHistory({}, teamProject);

		const response = await memberAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(200);

		expect(response.body.data.reviewRequired).toBe(true);
	});

	it('allows a team project editor to update review-required', async () => {
		await enableWorkflowReviews();
		const teamProject = await createTeamProject('Editor Team', owner);
		await linkUserToProject(member, teamProject, 'project:editor');
		const workflow = await createWorkflowWithHistory({}, teamProject);

		const response = await memberAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(200);

		expect(response.body.data).toMatchObject({
			reviewRequired: true,
			canEdit: true,
		});
	});

	it('rejects when the caller lacks workflow:update permission', async () => {
		await enableWorkflowReviews();
		const teamProject = await createTeamProject('Viewer Team', owner);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const workflow = await createWorkflowWithHistory({}, teamProject);

		const response = await memberAgent
			.patch(`/workflows/${workflow.id}/review-required`)
			.send({ reviewRequired: true })
			.expect(403);

		expect(response.body).toHaveProperty(
			'message',
			'User is missing a scope required to perform this action',
		);
	});

	it('returns canEdit false when the caller lacks workflow:update permission', async () => {
		await enableWorkflowReviews();
		const teamProject = await createTeamProject('Viewer Team', owner);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const workflow = await createWorkflowWithHistory({}, teamProject);

		const response = await memberAgent.get(`/workflows/${workflow.id}/review-required`).expect(200);

		expect(response.body.data).toMatchObject({
			reviewRequired: false,
			canEdit: false,
		});
	});
});
