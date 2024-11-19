import { WorkflowHooks, type ExecutionError, type IWorkflowExecuteHooks } from 'n8n-workflow';
import Container from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import type { User } from '@/databases/entities/user';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { mockInstance } from '@test/mocking';
import { createExecution } from '@test-integration/db/executions';
import { createUser } from '@test-integration/db/users';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';
import { setupTestServer } from '@test-integration/utils';

let owner: User;
let runner: WorkflowRunner;
let hookFunctions: IWorkflowExecuteHooks;
setupTestServer({ endpointGroups: [] });

mockInstance(Telemetry);

class Watchers {
	workflowExecuteAfter = jest.fn();
}
const watchers = new Watchers();
const watchedWorkflowExecuteAfter = jest.spyOn(watchers, 'workflowExecuteAfter');

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });

	runner = Container.get(WorkflowRunner);

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

test('processError should return early if the error is `ExecutionNotFoundError`', async () => {
	const workflow = await createWorkflow({}, owner);
	const execution = await createExecution({ status: 'success', finished: true }, workflow);
	await runner.processError(
		new ExecutionNotFoundError(execution.id),
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
	await Container.get(ActiveExecutions).add(
		{ executionMode: 'webhook', workflowData: workflow },
		execution.id,
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
