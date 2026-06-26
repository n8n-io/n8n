import { testDb, createWorkflow, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	type User,
	type ExecutionEntity,
	GLOBAL_OWNER_ROLE,
	Project,
	ExecutionRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { Response } from 'express';
import { DirectedGraph, WorkflowExecute } from 'n8n-core';
import * as core from 'n8n-core';
import {
	type IExecuteData,
	type INode,
	type IRun,
	type IRunExecutionData,
	type ITaskData,
	type IWaitingForExecution,
	type IWaitingForExecutionSource,
	type IWorkflowBase,
	type IWorkflowExecutionDataProcess,
	type StartNodeData,
	type IWorkflowExecuteAdditionalData,
	type WorkflowExecuteMode,
	Workflow,
	ExecutionError,
	TimeoutExecutionCancelledError,
	createRunExecutionData,
} from 'n8n-workflow';
import PCancelable from 'p-cancelable';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import * as ExecutionLifecycleHooks from '@/execution-lifecycle/execution-lifecycle-hooks';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { ManualExecutionService } from '@/manual-execution.service';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';
import { createExecution } from '@test-integration/db/executions';
import { createUser } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

// `@/scaling/scaling.service` is dynamically imported by `enqueueExecution`.
// Define the mock at module top-level so the `vi.mock` factory (hoisted) can
// reference the class without a temporal-dead-zone error — a describe-scoped
// class isn't initialised when the hoisted factory first resolves.
const setupQueue = vi.fn();
const addJob = vi.fn();

@Service()
class MockScalingService {
	setupQueue = setupQueue;

	addJob = addJob;
}

vi.mock('@/scaling/scaling.service', () => ({
	ScalingService: MockScalingService,
}));

let owner: User;
let runner: WorkflowRunner;
const globalConfig = Container.get(GlobalConfig);
setupTestServer({ endpointGroups: [] });

mockInstance(Telemetry);

mockInstance(OwnershipService, {
	getWorkflowProjectCached: vi.fn().mockResolvedValue(mock<Project>({ id: 'project-id' })),
});

beforeAll(async () => {
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });

	runner = Container.get(WorkflowRunner);
});

afterAll(() => {
	vi.restoreAllMocks();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
	vi.clearAllMocks();
	vi.spyOn(Container.get(ExecutionRepository), 'setRunning').mockResolvedValue(new Date());
});

describe('processError', () => {
	let workflow: IWorkflowBase;
	let execution: ExecutionEntity;
	let hooks: core.ExecutionLifecycleHooks;

	const watcher = mock<{ workflowExecuteAfter: () => Promise<void> }>();

	beforeEach(async () => {
		vi.clearAllMocks();
		globalConfig.executions.mode = 'regular';
		workflow = await createWorkflow({}, owner);
		execution = await createExecution({ status: 'success', finished: true }, workflow);
		hooks = new core.ExecutionLifecycleHooks('webhook', execution.id, workflow);
		hooks.addHandler('workflowExecuteAfter', watcher.workflowExecuteAfter);
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
		globalConfig.executions.mode = 'queue';
		await runner.processError(
			new Error('test') as ExecutionError,
			new Date(),
			'webhook',
			execution.id,
			hooks,
		);
		expect(watcher.workflowExecuteAfter).toHaveBeenCalledTimes(0);
	});

	test('processError should return early if the error is `ExecutionNotFoundError`', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createExecution({ status: 'success', finished: true }, workflow);
		await runner.processError(
			new ExecutionNotFoundError(execution.id),
			new Date(),
			'webhook',
			execution.id,
			hooks,
		);
		expect(watcher.workflowExecuteAfter).toHaveBeenCalledTimes(0);
	});

	test('processError should process error', async () => {
		const workflow = await createWorkflow({}, owner);
		const execution = await createExecution(
			{
				status: 'waiting',
				finished: false,
			},
			workflow,
		);
		await Container.get(ActiveExecutions).add(
			{ executionMode: 'webhook', workflowData: workflow },
			execution.id,
		);
		globalConfig.executions.mode = 'regular';
		await runner.processError(
			new Error('test') as ExecutionError,
			new Date(),
			'webhook',
			execution.id,
			hooks,
		);
		expect(watcher.workflowExecuteAfter).toHaveBeenCalledTimes(1);
	});
});

describe('run', () => {
	it('uses recreateNodeExecutionStack to create a partial execution if a triggerToStartFrom with data is sent', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		vi.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		vi.spyOn(Workflow.prototype, 'getNode').mockReturnValueOnce(mock<INode>());
		vi.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValueOnce(new DirectedGraph());
		const recreateNodeExecutionStackSpy = vi
			.spyOn(core, 'recreateNodeExecutionStack')
			.mockReturnValueOnce({
				nodeExecutionStack: mock<IExecuteData[]>(),
				waitingExecution: mock<IWaitingForExecution>(),
				waitingExecutionSource: mock<IWaitingForExecutionSource>(),
			});

		const data = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: { name: 'trigger', data: mock<ITaskData>() },

			workflowData: { nodes: [], staticData: {} },
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
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		vi.spyOn(WorkflowExecute.prototype, 'run').mockReturnValueOnce(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		const recreateNodeExecutionStackSpy = vi.spyOn(core, 'recreateNodeExecutionStack');

		const data = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: { name: 'trigger', data: undefined },

			workflowData: { nodes: [], staticData: {} },
			executionData: undefined,
			startNodes: [mock<StartNodeData>()],
			destinationNode: undefined,
			runData: undefined,
		});

		// ACT
		await runner.run(data);

		// ASSERT
		expect(recreateNodeExecutionStackSpy).not.toHaveBeenCalled();
	});

	it('run partial execution with additional data', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		vi.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		vi.spyOn(Workflow.prototype, 'getNode').mockReturnValueOnce(mock<INode>());
		vi.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValueOnce(new DirectedGraph());

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
		vi.spyOn(ManualExecutionService.prototype, 'runManually');
		vi.spyOn(core, 'recreateNodeExecutionStack').mockReturnValueOnce({
			nodeExecutionStack: mock<IExecuteData[]>(),
			waitingExecution: mock<IWaitingForExecution>(),
			waitingExecutionSource: mock<IWaitingForExecutionSource>(),
		});

		const data = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: { name: 'trigger', data: mock<ITaskData>() },

			workflowData: { nodes: [], id: 'workflow-id', settings: undefined, staticData: {} },
			executionData: undefined,
			startNodes: [mock<StartNodeData>()],
			destinationNode: undefined,
			runData: {
				trigger: [mock<ITaskData>({ executionIndex: 7 })],
				otherNode: [mock<ITaskData>({ executionIndex: 8 }), mock<ITaskData>({ executionIndex: 9 })],
			},
			userId: 'mock-user-id',
		});

		// ACT
		await runner.run(data);

		// ASSERT
		expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({
			userId: data.userId,
			workflowId: 'workflow-id',
			executionTimeoutTimestamp: undefined,
			workflowSettings: {},
		});
		expect(ManualExecutionService.prototype.runManually).toHaveBeenCalledWith(
			data,
			expect.any(Workflow),
			additionalData,
			'1',
			undefined,
		);
	});

	describe('configureAdditionalData hook', () => {
		function arrangeRunDeps(executionData?: IRunExecutionData) {
			const activeExecutions = Container.get(ActiveExecutions);
			vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
			vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
			vi.spyOn(Container.get(CredentialsPermissionChecker), 'check').mockResolvedValueOnce();
			vi.spyOn(WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
				new PCancelable(() => mock<IRun>()),
			);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const data = mock<IWorkflowExecutionDataProcess>({
				workflowData: { nodes: [], id: 'workflow-id', settings: undefined, staticData: {} },
				executionData: executionData ?? createRunExecutionData({}),
				triggerToStartFrom: undefined,
				startNodes: undefined,
				destinationNode: undefined,
				userId: 'mock-user-id',
			});
			return { data, additionalData };
		}

		it('invokes the callback with additionalData once lifecycle hooks are wired', async () => {
			const { data, additionalData } = arrangeRunDeps();
			const configureAdditionalData = vi.fn((ad: IWorkflowExecuteAdditionalData) => {
				// Hooks must already be attached when the callback fires.
				expect(ad.hooks).toBeDefined();
			});
			data.configureAdditionalData = configureAdditionalData;

			await runner.run(data);

			expect(configureAdditionalData).toHaveBeenCalledTimes(1);
			expect(configureAdditionalData).toHaveBeenCalledWith(additionalData);
		});

		it('passes additionalData mutated by the callback into WorkflowExecute', async () => {
			const { data, additionalData } = arrangeRunDeps();
			const sentinel = vi.fn();
			data.configureAdditionalData = (ad: IWorkflowExecuteAdditionalData) => {
				ad.evalLlmMockHandler = sentinel;
			};

			await runner.run(data);

			// processRunExecutionData receives the WorkflowExecute instance, but
			// the constructor was given additionalData by reference — assert the
			// mutation landed on the same object the engine sees.
			expect(additionalData.evalLlmMockHandler).toBe(sentinel);
		});

		it('is a no-op when not provided', async () => {
			const { data } = arrangeRunDeps();
			// Not setting data.configureAdditionalData

			await expect(runner.run(data)).resolves.toBe('1');
		});
	});
});

describe('enqueueExecution', () => {
	it('should setup queue when scalingService is not initialized', async () => {
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValue();
		vi.spyOn(runner, 'processError').mockResolvedValue();
		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: { nodes: [], staticData: {} },
			executionData: undefined,
		});
		const error = new Error('stop for test purposes');

		// mock a rejection to stop execution flow before we create the PCancelable promise,
		// so that Jest does not move on to tear down the suite until the PCancelable settles
		addJob.mockRejectedValueOnce(error);

		// @ts-expect-error Private method
		await expect(runner.enqueueExecution('1', 'workflow-xyz', data)).rejects.toThrowError(error);

		expect(setupQueue).toHaveBeenCalledTimes(1);
	});

	it('should include restartExecutionId in job data when provided', async () => {
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValue();
		vi.spyOn(runner, 'processError').mockResolvedValue();
		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: { nodes: [], staticData: {} },
			executionData: undefined,
			pushRef: 'push-ref',
			streamingEnabled: true,
		});
		const error = new Error('stop for test purposes');

		// mock a rejection to stop execution flow before we create the PCancelable promise,
		// so that Jest does not move on to tear down the suite until the PCancelable settles
		addJob.mockRejectedValueOnce(error);

		const restartExecutionId = 'restart-execution-id';

		await expect(
			// @ts-expect-error Private method
			runner.enqueueExecution('1', 'workflow-xyz', data, false, false, restartExecutionId),
		).rejects.toThrowError(error);

		expect(addJob).toHaveBeenCalledWith(
			expect.objectContaining({
				workflowId: 'workflow-xyz',
				executionId: '1',
				restartExecutionId,
			}),
			expect.any(Object),
		);
	});
});

describe('workflow timeout with startedAt', () => {
	let mockSetTimeout: MockInstance;
	let recordedTimeout: number | undefined = undefined;

	beforeEach(() => {
		mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((_fn, timeout) => {
			// There can be multiple calls to setTimeout with 60000ms, these happen
			// when accessing the database, we only capture the first one not equal to 60000ms
			if (timeout !== 60000) {
				recordedTimeout = timeout; // Capture the timeout value for assertions
			}
			return {} as NodeJS.Timeout;
		});
	});

	it('should calculate timeout based on startedAt date when provided', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		const mockStopExecution = vi.spyOn(activeExecutions, 'stopExecution');

		// Mock config to return a workflow timeout of 10 seconds
		Container.get(GlobalConfig).executions.timeout = 10;

		const startedAt = new Date(Date.now() - 5000); // 5 seconds ago
		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: {
				nodes: [],
				staticData: {},
				settings: { executionTimeout: 10 }, // 10 seconds timeout
			},
			executionData: undefined,
			executionMode: 'webhook',
			startedAt,
		});

		const mockHooks = mock<core.ExecutionLifecycleHooks>();
		vi.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain').mockReturnValue(mockHooks);

		const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);

		const manualExecutionService = Container.get(ManualExecutionService);
		vi.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		// ACT
		await runner.run(data);

		// ASSERT
		// The timeout should be adjusted: 10 seconds - 5 seconds elapsed = ~5 seconds remaining
		expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));

		// Should be approximately 5000ms (5 seconds remaining), allowing for timing differences
		expect(recordedTimeout).toBeLessThan(6000);
		expect(recordedTimeout).toBeGreaterThan(4000);

		recordedTimeout = undefined; // Reset for next test

		// Execution should not be stopped immediately
		expect(mockStopExecution).not.toHaveBeenCalled();
	});

	it('should stop execution immediately when timeout has already elapsed', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		const mockStopExecution = vi.spyOn(activeExecutions, 'stopExecution');

		// Mock config to return a workflow timeout of 10 seconds
		Container.get(GlobalConfig).executions.timeout = 10;

		const startedAt = new Date(Date.now() - 15000); // 15 seconds ago (timeout already elapsed)
		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: {
				nodes: [],
				staticData: {},
				settings: { executionTimeout: 10 }, // 10 seconds timeout
			},
			executionData: undefined,
			executionMode: 'webhook',
			startedAt,
		});

		const mockHooks = mock<core.ExecutionLifecycleHooks>();
		vi.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain').mockReturnValue(mockHooks);

		const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);

		const manualExecutionService = Container.get(ManualExecutionService);
		vi.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		// ACT
		await runner.run(data);

		// ASSERT
		// The execution should be stopped immediately because the timeout has already elapsed
		expect(mockStopExecution).toHaveBeenCalledWith('1', expect.any(TimeoutExecutionCancelledError));
	});

	it('should use original timeout logic when startedAt is not provided', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		const mockStopExecution = vi.spyOn(activeExecutions, 'stopExecution');

		// Mock config to return a workflow timeout of 10 seconds
		Container.get(GlobalConfig).executions.timeout = 10;

		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: {
				nodes: [],
				staticData: {},
				settings: { executionTimeout: 10 }, // 10 seconds timeout
			},
			executionData: undefined,
			executionMode: 'webhook',
			// No startedAt provided
		});

		const mockHooks = mock<core.ExecutionLifecycleHooks>();
		vi.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain').mockReturnValue(mockHooks);

		const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);

		const manualExecutionService = Container.get(ManualExecutionService);
		vi.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		// ACT
		await runner.run(data);

		// ASSERT
		// The execution should not be stopped immediately (original timeout logic)
		expect(mockStopExecution).not.toHaveBeenCalled();
	});

	it('should call stopExecution when the timeout callback is executed', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		const mockStopExecution = vi.spyOn(activeExecutions, 'stopExecution');

		// Mock config to return a workflow timeout of 10 seconds
		Container.get(GlobalConfig).executions.timeout = 10;

		let timeoutCallback: (() => void) | undefined;
		vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
			if (typeof fn === 'function') {
				timeoutCallback = fn;
			}
			return {} as NodeJS.Timeout;
		});

		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: {
				nodes: [],
				staticData: {},
				settings: { executionTimeout: 10 }, // 10 seconds timeout
			},
			executionData: undefined,
			executionMode: 'webhook',
		});

		const mockHooks = mock<core.ExecutionLifecycleHooks>();
		vi.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain').mockReturnValue(mockHooks);

		const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);

		const manualExecutionService = Container.get(ManualExecutionService);
		vi.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		// ACT
		await runner.run(data);

		// Execute the timeout callback
		expect(timeoutCallback).toBeDefined();
		timeoutCallback!();

		// ASSERT
		// The execution should be stopped when the timeout callback is executed
		expect(mockStopExecution).toHaveBeenCalledWith('1', expect.any(TimeoutExecutionCancelledError));
	});
});

describe('needsFullExecutionData', () => {
	it('should return true when forceFullExecutionData is true', () => {
		// @ts-expect-error Private method
		const result = runner.needsFullExecutionData('evaluation', 'exec-id', true);

		expect(result).toBe(true);
	});

	it('should return false when forceFullExecutionData is undefined and mode is not integrated', () => {
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'getResponseMode').mockReturnValue('responseNode');

		// @ts-expect-error Private method
		const result = runner.needsFullExecutionData('webhook', 'exec-id', undefined);

		expect(result).toBe(false);
	});

	it('should return true when mode is integrated', () => {
		// @ts-expect-error Private method
		const result = runner.needsFullExecutionData('integrated', 'exec-id', undefined);

		expect(result).toBe(true);
	});
});

describe('pre-persist context establishment', () => {
	const callOrder: string[] = [];
	let establishSpy: MockInstance;
	let addSpy: MockInstance;
	let capturedAddData: IWorkflowExecutionDataProcess | undefined;

	const buildRunData = (
		executionData: IRunExecutionData | undefined,
		executionMode: WorkflowExecuteMode = 'webhook',
	): IWorkflowExecutionDataProcess =>
		mock<IWorkflowExecutionDataProcess>({
			executionMode,
			workflowData: {
				id: 'wf-1',
				name: 'Test',
				nodes: [],
				connections: {},
				settings: undefined,
				staticData: {},
			},
			executionData,
			userId: 'u1',
		});

	const buildExecutionDataWithHeader = (): IRunExecutionData =>
		createRunExecutionData({
			executionData: {
				contextData: {},
				nodeExecutionStack: [
					{
						node: {
							id: 'n1',
							name: 'Webhook',
							type: 'n8n-nodes-base.webhook',
							typeVersion: 2,
							position: [0, 0],
							parameters: {},
						},
						data: {
							main: [[{ json: { headers: { authorization: 'Bearer eyJtest' } } }]],
						},
						source: null,
					},
				],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		});

	beforeEach(() => {
		callOrder.length = 0;
		capturedAddData = undefined;

		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValue();

		establishSpy = vi
			.spyOn(core, 'establishExecutionContext')
			.mockImplementation(async (_workflow, runExecutionData) => {
				callOrder.push('establishExecutionContext');
				// Simulate real behaviour: mask header, set runtimeData.
				const stack = runExecutionData.executionData?.nodeExecutionStack;
				const item = stack?.[0]?.data?.main?.[0]?.[0];
				const headers = item && (item.json as { headers?: Record<string, string> }).headers;
				if (headers && typeof headers.authorization === 'string') {
					headers.authorization = '**********';
				}
				if (runExecutionData.executionData) {
					(runExecutionData.executionData as { runtimeData?: unknown }).runtimeData = {
						version: 1,
						establishedAt: Date.now(),
						source: 'webhook',
					};
				}
			});

		const activeExecutions = Container.get(ActiveExecutions);
		addSpy = vi
			.spyOn(activeExecutions, 'add')
			.mockImplementation(async (data: IWorkflowExecutionDataProcess) => {
				capturedAddData = data;
				callOrder.push('activeExecutions.add');
				throw new Error('short-circuit for test');
			});
	});

	afterEach(() => {
		establishSpy.mockRestore();
		addSpy.mockRestore();
	});

	it('calls establishExecutionContext before activeExecutions.add', async () => {
		const data = buildRunData(buildExecutionDataWithHeader());

		await expect(runner.run(data)).rejects.toThrow('short-circuit for test');

		expect(callOrder).toEqual(['establishExecutionContext', 'activeExecutions.add']);
	});

	it('passes masked executionData to activeExecutions.add', async () => {
		const data = buildRunData(buildExecutionDataWithHeader());

		await expect(runner.run(data)).rejects.toThrow('short-circuit for test');

		expect(capturedAddData).toBeDefined();
		const stack = capturedAddData!.executionData!.executionData!.nodeExecutionStack;
		expect(stack[0].data.main[0]![0].json).toMatchObject({
			headers: { authorization: '**********' },
		});
		expect(capturedAddData!.executionData!.executionData!.runtimeData).toBeDefined();
	});

	it('skips establishExecutionContext when data.executionData is undefined', async () => {
		const data = buildRunData(undefined);

		await expect(runner.run(data)).rejects.toThrow('short-circuit for test');

		expect(establishSpy).not.toHaveBeenCalled();
		expect(callOrder).toEqual(['activeExecutions.add']);
	});

	it('skips establishExecutionContext when nodeExecutionStack has not been populated yet', async () => {
		// Queue mode with OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true creates
		// the outer IRunExecutionData with `executionData: null`, which
		// `createRunExecutionData` normalises to an object whose inner
		// `.executionData` is undefined. The worker establishes context
		// later, once it populates the trigger-item stack.
		const data = buildRunData(createRunExecutionData({ executionData: null }), 'manual');

		await expect(runner.run(data)).rejects.toThrow('short-circuit for test');

		expect(establishSpy).not.toHaveBeenCalled();
		expect(callOrder).toEqual(['activeExecutions.add']);
	});

	describe('when establishExecutionContext throws', () => {
		const lifecycleRunHook = vi.fn().mockResolvedValue(undefined);
		const responseReject = vi.fn();

		beforeEach(() => {
			establishSpy.mockReset();
			establishSpy.mockImplementation(async () => {
				callOrder.push('establishExecutionContext');
				throw new Error('hook augmentation failed');
			});

			addSpy.mockReset();
			addSpy.mockImplementation(async (data: IWorkflowExecutionDataProcess) => {
				capturedAddData = data;
				callOrder.push('activeExecutions.add');
				return 'exec-1';
			});

			lifecycleRunHook.mockClear();
			responseReject.mockClear();
			vi.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain').mockReturnValue(
				mock<core.ExecutionLifecycleHooks>({ runHook: lifecycleRunHook }),
			);
			vi.spyOn(Container.get(ActiveExecutions), 'finalizeExecution').mockReturnValue();
		});

		it('clears the trigger-item stack so raw headers do not get persisted', async () => {
			const data = buildRunData(buildExecutionDataWithHeader());

			await runner.run(data, undefined, undefined, undefined, {
				reject: responseReject,
				resolve: vi.fn(),
				promise: Promise.resolve() as never,
			} as never);

			expect(capturedAddData).toBeDefined();
			expect(capturedAddData!.executionData!.executionData!.nodeExecutionStack).toEqual([]);
		});

		it('creates a failed-execution record and rejects the responsePromise', async () => {
			const data = buildRunData(buildExecutionDataWithHeader());

			const executionId = await runner.run(data, undefined, undefined, undefined, {
				reject: responseReject,
				resolve: vi.fn(),
				promise: Promise.resolve() as never,
			} as never);

			expect(executionId).toBe('exec-1');
			expect(lifecycleRunHook).toHaveBeenCalledWith('workflowExecuteBefore', [
				undefined,
				data.executionData,
			]);
			expect(lifecycleRunHook).toHaveBeenCalledWith('workflowExecuteAfter', [expect.any(Object)]);
			expect(responseReject).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'hook augmentation failed' }),
			);
		});
	});
});

describe('streaming functionality', () => {
	it('should setup heartbeat interval and sendChunk handler when streaming is enabled', async () => {
		// ARRANGE
		const activeExecutions = Container.get(ActiveExecutions);
		vi.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		vi.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		vi.spyOn(activeExecutions, 'getPostExecutePromise').mockReturnValue(new Promise(() => {}));
		const permissionChecker = Container.get(CredentialsPermissionChecker);
		vi.spyOn(permissionChecker, 'check').mockResolvedValueOnce();

		const mockResponse = mock<Response>({ writableEnded: false });
		const mockSetInterval = vi.spyOn(global, 'setInterval');

		const data = mock<IWorkflowExecutionDataProcess>({
			workflowData: { nodes: [], staticData: {} },
			executionData: undefined,
			executionMode: 'webhook',
			streamingEnabled: true,
			httpResponse: mockResponse,
		});

		const mockHooks = mock<core.ExecutionLifecycleHooks>();
		vi.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain').mockReturnValue(mockHooks);

		const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);

		const manualExecutionService = Container.get(ManualExecutionService);
		vi.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new PCancelable(() => {
				return mock<IRun>();
			}),
		);

		// ACT
		await runner.run(data);

		// ASSERT
		// Heartbeat interval is set up in run() before queue/local decision
		expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30_000);
		// sendChunk handler is still registered on lifecycle hooks
		expect(mockHooks.addHandler).toHaveBeenCalledWith('sendChunk', expect.any(Function));

		mockSetInterval.mockRestore();
	});
});
