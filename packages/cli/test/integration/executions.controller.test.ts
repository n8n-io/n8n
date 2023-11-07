import * as testDb from './shared/testDb';
import { setupTestServer } from './shared/utils';
import type { User } from '@/databases/entities/User';

let testServer = setupTestServer({ endpointGroups: ['executions'] });

let owner: User;

const saveExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await testDb.createWorkflow({}, belongingTo);
	return testDb.createSuccessfulExecution(workflow);
};

beforeEach(async () => {
	await testDb.truncate(['Execution', 'Workflow', 'SharedWorkflow']);
	owner = await testDb.createOwner();
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

		const executions = await testDb.getAllExecutions();

		expect(executions).toHaveLength(0);
	});
});
