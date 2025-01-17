import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DirectedGraph, WorkflowExecute } from 'n8n-core';
import * as core from 'n8n-core';
import type {
	IExecuteData,
	INode,
	IRun,
	ITaskData,
	IWaitingForExecution,
	IWaitingForExecutionSource,
	IWorkflowExecutionDataProcess,
	StartNodeData,
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowHooks,
	type ExecutionError,
	type IWorkflowExecuteHooks,
} from 'n8n-workflow';
import PCancelable from 'p-cancelable';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import type { User } from '@/databases/entities/user';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { Telemetry } from '@/telemetry';
import { PermissionChecker } from '@/user-management/permission-checker';
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
	jest.clearAllMocks();
});

describe('processError', () => {
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
});

describe('run', () => {
	it('uses recreateNodeExecutionStack to create a partial execution if a triggerToStartFrom with data is sent', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(PermissionChecker);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		jest.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		jest.spyOn(Workflow.prototype, 'getNode').mockReturnValueOnce(mock<INode>());
		jest.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValueOnce(new DirectedGraph());
		const recreateNodeExecutionStackSpy = jest
			.spyOn(core, 'recreateNodeExecutionStack')
			.mockReturnValueOnce({
				nodeExecutionStack: mock<IExecuteData[]>(),
				waitingExecution: mock<IWaitingForExecution>(),
				waitingExecutionSource: mock<IWaitingForExecutionSource>(),
			});

		const data = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: { name: 'trigger', data: mock<ITaskData>() },

			workflowData: { nodes: [] },
			executionData: undefined,
			startNodes: [mock<StartNodeData>()],
			destinationNode: undefined,
		});

		// ACT
		await runner.run(data);

		// ASSERT
		expect(recreateNodeExecutionStackSpy).toHaveBeenCalled();
	});

	it('does not use recreateNodeExecutionStack to create a partial execution if a triggerToStartFrom without data is sent', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(PermissionChecker);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		jest.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		const recreateNodeExecutionStackSpy = jest.spyOn(core, 'recreateNodeExecutionStack');

		const data = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: { name: 'trigger', data: undefined },

			workflowData: { nodes: [] },
			executionData: undefined,
			startNodes: [mock<StartNodeData>()],
			destinationNode: undefined,
		});

		// ACT
		await runner.run(data);

		// ASSERT
		expect(recreateNodeExecutionStackSpy).not.toHaveBeenCalled();
	});
});
