import {
	createTeamProject,
	linkUserToProject,
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import { ExecutionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { parse, stringify } from 'flatted';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { WaitTracker } from '@/wait-tracker';

import {
	createExecution,
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
	test('only returns executions of shared workflows if sharing is enabled', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		await createSuccessfulExecution(workflow);

		const response1 = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response1.body.data.count).toBe(0);

		testServer.license.enable('feat:sharing');

		const response2 = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response2.body.data.count).toBe(1);
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
		// if sharing is not enabled, we're only returning the executions of
		// personal workflows
		testServer.license.enable('feat:sharing');

		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const workflow = await createWorkflow({}, teamProject);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
	});

	describe('push session fields', () => {
		const PUSH_REF = 'push-ref-of-the-owner';
		const PUSH_REF_USER_ID = 'user-id-of-the-owner';

		const createWaitingExecutionForViewer = async () => {
			testServer.license.enable('feat:sharing');
			const teamProject = await createTeamProject();
			await linkUserToProject(member, teamProject, 'project:viewer');
			const workflow = await createWorkflow({}, teamProject);
			return await createExecution(
				{
					finished: false,
					status: 'waiting',
					waitTill: new Date(),
					data: stringify({
						pushRef: PUSH_REF,
						pushRefUserId: PUSH_REF_USER_ID,
						resultData: { runData: {} },
					}),
				},
				workflow,
			);
		};

		test('keeps the stored push session fields after a read', async () => {
			const execution = await createWaitingExecutionForViewer();

			await testServer.authAgentFor(member).get(`/executions/${execution.id}`).expect(200);

			const stored = await Container.get(ExecutionRepository).findSingleExecution(execution.id, {
				includeData: true,
				unflattenData: true,
			});
			expect(stored?.data.pushRef).toBe(PUSH_REF);
			expect(stored?.data.pushRefUserId).toBe(PUSH_REF_USER_ID);
		});

		test('hides the push session fields from a project viewer', async () => {
			const execution = await createWaitingExecutionForViewer();

			const response = await testServer
				.authAgentFor(member)
				.get(`/executions/${execution.id}`)
				.expect(200);

			const data = parse(response.body.data.data);
			expect(data).toHaveProperty('resultData');
			expect(data).not.toHaveProperty('pushRef');
			expect(data).not.toHaveProperty('pushRefUserId');
		});
	});

	test('only returns executions of shared workflows if sharing is enabled', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		const execution = await createSuccessfulExecution(workflow);

		await testServer.authAgentFor(member).get(`/executions/${execution.id}`).expect(404);

		testServer.license.enable('feat:sharing');

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
			.expect(500);
	});

	test('should stop an execution we have access to', async () => {
		const execution = await saveWaitingExecution({ belongingTo: owner });

		await testServer.authAgentFor(owner).post(`/executions/${execution.id}/stop`).expect(200);
	});
});
