import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { createAdmin, createUser } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import {
	createReviewableWorkflow,
	REVIEW_TABLES,
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
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let policyService: WorkflowReviewPolicyService;

beforeAll(async () => {
	await utils.initNodeTypes();
	policyService = Container.get(WorkflowReviewPolicyService);
});

beforeEach(async () => {
	testServer.license.enable('feat:workflowReviews');
	await testDb.truncate([...REVIEW_TABLES]);
	await policyService.set(true);
	stubWorkflowValidation(workflowValidationService);

	({ owner, member, ownerAgent, memberAgent } = await seedReviewActors(testServer.authAgentFor));
});

const getEligibleReviewers = (agent: SuperAgentTest, workflowId: string) =>
	agent.get('/workflow-review-requests/eligible-reviewers').query({ workflowId });

describe('GET /workflow-review-requests/eligible-reviewers', () => {
	test('returns project viewers, editors, and instance users, excluding everyone else', async () => {
		const project = await createTeamProject('team', owner);
		// The requester holds workflow:publish through project:editor
		await linkUserToProject(member, project, 'project:editor');

		const projectAdmin = await createUser();
		await linkUserToProject(projectAdmin, project, 'project:admin');
		const projectEditor = await createUser();
		await linkUserToProject(projectEditor, project, 'project:editor');
		const projectViewer = await createUser();
		await linkUserToProject(projectViewer, project, 'project:viewer');
		const globalAdmin = await createAdmin();

		const disabledEditor = await createUser({ disabled: true });
		await linkUserToProject(disabledEditor, project, 'project:editor');
		const pendingEditor = await createUser({ password: null });
		await linkUserToProject(pendingEditor, project, 'project:editor');
		await createUser(); // unrelated member

		const workflow = await createWorkflow({}, project);

		const response = await getEligibleReviewers(memberAgent, workflow.id).expect(200);

		expect(response.body.data.count).toBe(5);
		const ids = response.body.data.data.map((reviewer: { id: string }) => reviewer.id);
		expect(ids.sort()).toEqual(
			[owner.id, projectAdmin.id, projectEditor.id, projectViewer.id, globalAdmin.id].sort(),
		);
	});

	test('returns a user holding both a project and a global qualifying role only once', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:editor');
		const globalAdmin = await createAdmin();
		await linkUserToProject(globalAdmin, project, 'project:admin');
		const workflow = await createWorkflow({}, project);

		const response = await getEligibleReviewers(memberAgent, workflow.id).expect(200);

		const ids = response.body.data.data.filter(
			(reviewer: { id: string }) => reviewer.id === globalAdmin.id,
		);
		expect(ids).toHaveLength(1);
	});

	test('returns only instance-level reviewers for a personal-project workflow, exposing just id, email and names', async () => {
		const globalAdmin = await createAdmin();
		const { workflow } = await createReviewableWorkflow(owner);

		const response = await getEligibleReviewers(ownerAgent, workflow.id).expect(200);

		// The requesting owner is excluded; the plain member holds no read rights on this personal project
		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toEqual([
			{
				id: globalAdmin.id,
				email: globalAdmin.email,
				firstName: globalAdmin.firstName,
				lastName: globalAdmin.lastName,
			},
		]);
	});

	test('hides a workflow the caller cannot access', async () => {
		const { workflow } = await createReviewableWorkflow(owner);

		await getEligibleReviewers(memberAgent, workflow.id).expect(404);
	});

	test('hides a workflow the caller can only view', async () => {
		const project = await createTeamProject('team', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const workflow = await createWorkflow({}, project);

		await getEligibleReviewers(memberAgent, workflow.id).expect(404);
	});

	test('refuses everything once an admin turns reviews off', async () => {
		const { workflow } = await createReviewableWorkflow(owner);
		await policyService.set(false);

		await getEligibleReviewers(ownerAgent, workflow.id).expect(403);
	});
});
