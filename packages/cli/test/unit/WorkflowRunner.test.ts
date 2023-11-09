import type { User } from '@db/entities/User';
import * as testDb from '../integration/shared/testDb';
import * as utils from '../integration/shared/utils/';
import { WorkflowRunner } from '@/WorkflowRunner';
import { WorkflowHooks, type ExecutionError, type IWorkflowExecuteHooks } from 'n8n-workflow';
import { Push } from '@/push';
import { mockInstance } from '../integration/shared/utils';
import Container from 'typedi';
import config from '@/config';
import { getGlobalOwnerRole } from '../integration/shared/db/roles';
import { createUser } from '../integration/shared/db/users';
import { createWorkflow } from '../integration/shared/db/workflows';
import { createExecution } from '../integration/shared/db/executions';

let owner: User;
let runner: WorkflowRunner;
let hookFunctions: IWorkflowExecuteHooks;
utils.setupTestServer({ endpointGroups: [] });

class Watchers {
	workflowExecuteAfter = jest.fn();
}
const watchers = new Watchers();
const watchedWorkflowExecuteAfter = jest.spyOn(watchers, 'workflowExecuteAfter');

beforeAll(async () => {
	const globalOwnerRole = await getGlobalOwnerRole();
	owner = await createUser({ globalRole: globalOwnerRole });

	mockInstance(Push);
	Container.set(Push, new Push());

	runner = new WorkflowRunner();

	hookFunctions = {
		workflowExecuteAfter: [watchers.workflowExecuteAfter],
	};
});

afterAll(() => {
	jest.restoreAllMocks();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow']);
});

test('processError should return early in Bull stalled edge case', async () => {
	const workflow = await createWorkflow({}, owner);
	const execution = await createExecution(
		{
			status: 'success',
			finished: true,
		},
		workflow,
	);
	config.set('executions.mode', 'queue');
	await runner.processError(
		new Error('test') as ExecutionError,
		new Date(),
		'webhook',
		execution.id,
		new WorkflowHooks(hookFunctions, 'webhook', execution.id, workflow),
	);
	expect(watchedWorkflowExecuteAfter).toHaveBeenCalledTimes(0);
});

test('processError should process error', async () => {
	const workflow = await createWorkflow({}, owner);
	const execution = await createExecution(
		{
			status: 'success',
			finished: true,
		},
		workflow,
	);
	config.set('executions.mode', 'regular');
	await runner.processError(
		new Error('test') as ExecutionError,
		new Date(),
		'webhook',
		execution.id,
		new WorkflowHooks(hookFunctions, 'webhook', execution.id, workflow),
	);
	expect(watchedWorkflowExecuteAfter).toHaveBeenCalledTimes(1);
});
