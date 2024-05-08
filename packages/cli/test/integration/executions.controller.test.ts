import type { User } from '@db/entities/User';

import { createSuccessfulExecution, getAllExecutions } from './shared/db/executions';
import { createMember, createOwner } from './shared/db/users';
import { createWorkflow, shareWorkflowWithUsers } from './shared/db/workflows';
import * as testDb from './shared/testDb';
import { setupTestServer } from './shared/utils';
import { mockInstance } from '../shared/mocking';
import { WaitTracker } from '@/WaitTracker';

const testServer = setupTestServer({ endpointGroups: ['executions'] });

let owner: User;
let member: User;

// This is necessary for the tests to shutdown cleanly.
mockInstance(WaitTracker);

const saveExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await createWorkflow({}, belongingTo);
	return await createSuccessfulExecution(workflow);
};

beforeEach(async () => {
	await testDb.truncate(['Execution', 'Workflow', 'SharedWorkflow']);
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
});

describe('GET /executions/:id', () => {
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
