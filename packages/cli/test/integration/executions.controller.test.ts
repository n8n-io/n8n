import type { User } from '@db/entities/User';
import { EnterpriseExecutionsService } from '@/executions/execution.service.ee';
import { WaitTracker } from '@/WaitTracker';

import { createSuccessfulExecution, getAllExecutions } from './shared/db/executions';
import { createOwner } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import * as testDb from './shared/testDb';
import { setupTestServer } from './shared/utils';
import { mockInstance } from '../shared/mocking';

mockInstance(EnterpriseExecutionsService);
mockInstance(WaitTracker);

let testServer = setupTestServer({ endpointGroups: ['executions'] });

let owner: User;

const saveExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await createWorkflow({}, belongingTo);
	return await createSuccessfulExecution(workflow);
};

beforeEach(async () => {
	await testDb.truncate(['Execution', 'Workflow', 'SharedWorkflow']);
	owner = await createOwner();
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
