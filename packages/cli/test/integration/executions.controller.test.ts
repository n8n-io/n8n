import {
	createTeamProject,
	linkUserToProject,
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { WaitTracker } from '@/wait-tracker';

import {
	createSuccessfulExecution,
	createWaitingExecution,
	getAllExecutions,
} from './shared/db/executions';
import { createMember, createOwner } from './shared/db/users';
import { setupTestServer } from './shared/utils';

mockInstance(WaitTracker);
mockInstance(ConcurrencyControlService, {
	// @ts-expect-error Private property
	isEnabled: false,
});

const testServer = setupTestServer({ endpointGroups: ['executions'] });

let owner: User;
let member: User;

const saveExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await createWorkflow({}, belongingTo);
	return await createSuccessfulExecution(workflow);
};

const saveWaitingExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await createWorkflow({}, belongingTo);
	return await createWaitingExecution(workflow);
};

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
	testServer.license.reset();
	owner = await createOwner();
	member = await createMember();
});

describe('GET /executions', () => {
	test('returns executions of workflows shared with the user regardless of sharing license', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		await createSuccessfulExecution(workflow);

		const responseWithoutLicense = await testServer
			.authAgentFor(member)
			.get('/executions')
			.expect(200);
		expect(responseWithoutLicense.body.data.count).toBe(1);

		testServer.license.enable('feat:sharing');

		const responseWithLicense = await testServer
			.authAgentFor(member)
			.get('/executions')
			.expect(200);
		expect(responseWithLicense.body.data.count).toBe(1);
	});

	test('project admins can list executions of project workflows without the sharing license', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:admin');

		const workflow = await createWorkflow({}, teamProject);
		await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get('/executions').expect(200);

		expect(response.body.data.count).toBe(1);
	});

	test('should return a scopes array for each execution', async () => {
		testServer.license.enable('feat:sharing');
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response.body.data.results[0].scopes).toContain('workflow:execute');
	});
});

describe('GET /executions/:id', () => {
	test('project viewers can view executions for workflows in the project', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const workflow = await createWorkflow({}, teamProject);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
	});

	test('project admins can view executions for workflows in the project without the sharing license', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:admin');

		const workflow = await createWorkflow({}, teamProject);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
	});

	test('returns executions of workflows shared with the user without the sharing license', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer
			.authAgentFor(member)
			.get(`/executions/${execution.id}`)
			.expect(200);

		expect(response.body.data.id).toBe(execution.id);
	});
});

describe('POST /executions/delete', () => {
	test('should hard-delete an execution', async () => {
		await saveExecution({ belongingTo: owner });

		const response = await testServer.authAgentFor(owner).get('/executions').expect(200);

		expect(response.body.data.count).toBe(1);

		const [execution] = response.body.data.results;

		await testServer
			.authAgentFor(owner)
			.post('/executions/delete')
			.send({ ids: [execution.id] })
			.expect(200);

		const executions = await getAllExecutions();

		expect(executions).toHaveLength(0);
	});
});

describe('POST /executions/stop', () => {
	test('should not stop an execution we do not have access to', async () => {
		await saveExecution({ belongingTo: owner });
		const incorrectExecutionId = '1234';

		await testServer
			.authAgentFor(owner)
			.post(`/executions/${incorrectExecutionId}/stop`)
			.expect(400);
	});

	test('should stop an execution we have access to', async () => {
		const execution = await saveWaitingExecution({ belongingTo: owner });

		await testServer.authAgentFor(owner).post(`/executions/${execution.id}/stop`).expect(200);
	});
});
describe('POST /executions/stopMany', () => {
	test('should not stop an execution we do not have access to', async () => {
		await saveWaitingExecution({ belongingTo: owner });

		const result = await testServer
			.authAgentFor(member)
			.post('/executions/stopMany')
			.send({ filter: { status: ['waiting'] } })
			.expect(200);

		expect(result.body.data.stopped).toBe(0);
	});

	test('should stop an execution we have access to', async () => {
		await saveWaitingExecution({ belongingTo: owner });

		const result = await testServer
			.authAgentFor(owner)
			.post('/executions/stopMany')
			.send({ filter: { status: ['waiting'] } })
			.expect(200);

		expect(result.body.data.stopped).toBe(1);
	});
});
