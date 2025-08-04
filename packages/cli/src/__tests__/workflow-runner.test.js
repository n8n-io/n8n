'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const core = __importStar(require('n8n-core'));
const n8n_workflow_1 = require('n8n-workflow');
const p_cancelable_1 = __importDefault(require('p-cancelable'));
const active_executions_1 = require('@/active-executions');
const config_1 = __importDefault(require('@/config'));
const execution_not_found_error_1 = require('@/errors/execution-not-found-error');
const ExecutionLifecycleHooks = __importStar(
	require('@/execution-lifecycle/execution-lifecycle-hooks'),
);
const pre_execution_checks_1 = require('@/executions/pre-execution-checks');
const manual_execution_service_1 = require('@/manual-execution.service');
const telemetry_1 = require('@/telemetry');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_runner_1 = require('@/workflow-runner');
const executions_1 = require('@test-integration/db/executions');
const users_1 = require('@test-integration/db/users');
const utils_1 = require('@test-integration/utils');
let owner;
let runner;
(0, utils_1.setupTestServer)({ endpointGroups: [] });
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
beforeAll(async () => {
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	runner = di_1.Container.get(workflow_runner_1.WorkflowRunner);
});
afterAll(() => {
	jest.restoreAllMocks();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
	jest.clearAllMocks();
});
describe('processError', () => {
	let workflow;
	let execution;
	let hooks;
	const watcher = (0, jest_mock_extended_1.mock)();
	beforeEach(async () => {
		jest.clearAllMocks();
		workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		execution = await (0, executions_1.createExecution)(
			{ status: 'success', finished: true },
			workflow,
		);
		hooks = new core.ExecutionLifecycleHooks('webhook', execution.id, workflow);
		hooks.addHandler('workflowExecuteAfter', watcher.workflowExecuteAfter);
	});
	test('processError should return early in Bull stalled edge case', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const execution = await (0, executions_1.createExecution)(
			{
				status: 'success',
				finished: true,
			},
			workflow,
		);
		config_1.default.set('executions.mode', 'queue');
		await runner.processError(new Error('test'), new Date(), 'webhook', execution.id, hooks);
		expect(watcher.workflowExecuteAfter).toHaveBeenCalledTimes(0);
	});
	test('processError should return early if the error is `ExecutionNotFoundError`', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const execution = await (0, executions_1.createExecution)(
			{ status: 'success', finished: true },
			workflow,
		);
		await runner.processError(
			new execution_not_found_error_1.ExecutionNotFoundError(execution.id),
			new Date(),
			'webhook',
			execution.id,
			hooks,
		);
		expect(watcher.workflowExecuteAfter).toHaveBeenCalledTimes(0);
	});
	test('processError should process error', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		const execution = await (0, executions_1.createExecution)(
			{
				status: 'success',
				finished: true,
			},
			workflow,
		);
		await di_1.Container.get(active_executions_1.ActiveExecutions).add(
			{ executionMode: 'webhook', workflowData: workflow },
			execution.id,
		);
		config_1.default.set('executions.mode', 'regular');
		await runner.processError(new Error('test'), new Date(), 'webhook', execution.id, hooks);
		expect(watcher.workflowExecuteAfter).toHaveBeenCalledTimes(1);
	});
});
describe('run', () => {
	it('uses recreateNodeExecutionStack to create a partial execution if a triggerToStartFrom with data is sent', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		jest.spyOn(n8n_core_1.WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		jest
			.spyOn(n8n_workflow_1.Workflow.prototype, 'getNode')
			.mockReturnValueOnce((0, jest_mock_extended_1.mock)());
		jest
			.spyOn(n8n_core_1.DirectedGraph, 'fromWorkflow')
			.mockReturnValueOnce(new n8n_core_1.DirectedGraph());
		const recreateNodeExecutionStackSpy = jest
			.spyOn(core, 'recreateNodeExecutionStack')
			.mockReturnValueOnce({
				nodeExecutionStack: (0, jest_mock_extended_1.mock)(),
				waitingExecution: (0, jest_mock_extended_1.mock)(),
				waitingExecutionSource: (0, jest_mock_extended_1.mock)(),
			});
		const data = (0, jest_mock_extended_1.mock)({
			triggerToStartFrom: { name: 'trigger', data: (0, jest_mock_extended_1.mock)() },
			workflowData: { nodes: [] },
			executionData: undefined,
			startNodes: [(0, jest_mock_extended_1.mock)()],
			destinationNode: undefined,
		});
		await runner.run(data);
		expect(recreateNodeExecutionStackSpy).toHaveBeenCalled();
	});
	it('does not use recreateNodeExecutionStack to create a partial execution if a triggerToStartFrom without data is sent', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		jest.spyOn(n8n_core_1.WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		const recreateNodeExecutionStackSpy = jest.spyOn(core, 'recreateNodeExecutionStack');
		const data = (0, jest_mock_extended_1.mock)({
			triggerToStartFrom: { name: 'trigger', data: undefined },
			workflowData: { nodes: [] },
			executionData: undefined,
			startNodes: [(0, jest_mock_extended_1.mock)()],
			destinationNode: undefined,
		});
		await runner.run(data);
		expect(recreateNodeExecutionStackSpy).not.toHaveBeenCalled();
	});
	it('run partial execution with additional data', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		jest.spyOn(n8n_core_1.WorkflowExecute.prototype, 'processRunExecutionData').mockReturnValueOnce(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		jest
			.spyOn(n8n_workflow_1.Workflow.prototype, 'getNode')
			.mockReturnValueOnce((0, jest_mock_extended_1.mock)());
		jest
			.spyOn(n8n_core_1.DirectedGraph, 'fromWorkflow')
			.mockReturnValueOnce(new n8n_core_1.DirectedGraph());
		const additionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
		jest.spyOn(manual_execution_service_1.ManualExecutionService.prototype, 'runManually');
		jest.spyOn(core, 'recreateNodeExecutionStack').mockReturnValueOnce({
			nodeExecutionStack: (0, jest_mock_extended_1.mock)(),
			waitingExecution: (0, jest_mock_extended_1.mock)(),
			waitingExecutionSource: (0, jest_mock_extended_1.mock)(),
		});
		const data = (0, jest_mock_extended_1.mock)({
			triggerToStartFrom: { name: 'trigger', data: (0, jest_mock_extended_1.mock)() },
			workflowData: { nodes: [] },
			executionData: undefined,
			startNodes: [(0, jest_mock_extended_1.mock)()],
			destinationNode: undefined,
			runData: {
				trigger: [(0, jest_mock_extended_1.mock)({ executionIndex: 7 })],
				otherNode: [
					(0, jest_mock_extended_1.mock)({ executionIndex: 8 }),
					(0, jest_mock_extended_1.mock)({ executionIndex: 9 }),
				],
			},
			userId: 'mock-user-id',
		});
		await runner.run(data);
		expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith(
			data.userId,
			undefined,
			undefined,
		);
		expect(
			manual_execution_service_1.ManualExecutionService.prototype.runManually,
		).toHaveBeenCalledWith(
			data,
			expect.any(n8n_workflow_1.Workflow),
			additionalData,
			'1',
			undefined,
		);
	});
});
describe('enqueueExecution', () => {
	const setupQueue = jest.fn();
	const addJob = jest.fn();
	let MockScalingService = class MockScalingService {
		constructor() {
			this.setupQueue = setupQueue;
			this.addJob = addJob;
		}
	};
	MockScalingService = __decorate([(0, di_1.Service)()], MockScalingService);
	beforeAll(() => {
		jest.mock('@/scaling/scaling.service', () => ({
			ScalingService: MockScalingService,
		}));
	});
	afterAll(() => {
		jest.unmock('@/scaling/scaling.service');
	});
	it('should setup queue when scalingService is not initialized', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValue();
		jest.spyOn(runner, 'processError').mockResolvedValue();
		const data = (0, jest_mock_extended_1.mock)({
			workflowData: { nodes: [] },
			executionData: undefined,
		});
		const error = new Error('stop for test purposes');
		addJob.mockRejectedValueOnce(error);
		await expect(runner.enqueueExecution('1', 'workflow-xyz', data)).rejects.toThrowError(error);
		expect(setupQueue).toHaveBeenCalledTimes(1);
	});
});
describe('workflow timeout with startedAt', () => {
	let mockSetTimeout;
	let recordedTimeout = undefined;
	beforeAll(() => {
		mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((_fn, timeout) => {
			if (timeout !== 60000) {
				recordedTimeout = timeout;
			}
			return {};
		});
	});
	afterAll(() => {
		mockSetTimeout.mockRestore();
	});
	it('should calculate timeout based on startedAt date when provided', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		const mockStopExecution = jest.spyOn(activeExecutions, 'stopExecution');
		jest.spyOn(config_1.default, 'getEnv').mockReturnValue(10);
		const startedAt = new Date(Date.now() - 5000);
		const data = (0, jest_mock_extended_1.mock)({
			workflowData: {
				nodes: [],
				settings: { executionTimeout: 10 },
			},
			executionData: undefined,
			executionMode: 'webhook',
			startedAt,
		});
		const mockHooks = (0, jest_mock_extended_1.mock)();
		jest
			.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain')
			.mockReturnValue(mockHooks);
		const mockAdditionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);
		const manualExecutionService = di_1.Container.get(
			manual_execution_service_1.ManualExecutionService,
		);
		jest.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		await runner.run(data);
		expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
		expect(recordedTimeout).toBeLessThan(6000);
		expect(recordedTimeout).toBeGreaterThan(4000);
		recordedTimeout = undefined;
		expect(mockStopExecution).not.toHaveBeenCalled();
	});
	it('should stop execution immediately when timeout has already elapsed', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		const mockStopExecution = jest.spyOn(activeExecutions, 'stopExecution');
		jest.spyOn(config_1.default, 'getEnv').mockReturnValue(10);
		const startedAt = new Date(Date.now() - 15000);
		const data = (0, jest_mock_extended_1.mock)({
			workflowData: {
				nodes: [],
				settings: { executionTimeout: 10 },
			},
			executionData: undefined,
			executionMode: 'webhook',
			startedAt,
		});
		const mockHooks = (0, jest_mock_extended_1.mock)();
		jest
			.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain')
			.mockReturnValue(mockHooks);
		const mockAdditionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);
		const manualExecutionService = di_1.Container.get(
			manual_execution_service_1.ManualExecutionService,
		);
		jest.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		await runner.run(data);
		expect(mockStopExecution).toHaveBeenCalledWith('1');
	});
	it('should use original timeout logic when startedAt is not provided', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		const mockStopExecution = jest.spyOn(activeExecutions, 'stopExecution');
		jest.spyOn(config_1.default, 'getEnv').mockReturnValue(10);
		const data = (0, jest_mock_extended_1.mock)({
			workflowData: {
				nodes: [],
				settings: { executionTimeout: 10 },
			},
			executionData: undefined,
			executionMode: 'webhook',
		});
		const mockHooks = (0, jest_mock_extended_1.mock)();
		jest
			.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain')
			.mockReturnValue(mockHooks);
		const mockAdditionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);
		const manualExecutionService = di_1.Container.get(
			manual_execution_service_1.ManualExecutionService,
		);
		jest.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		await runner.run(data);
		expect(mockStopExecution).not.toHaveBeenCalled();
	});
});
describe('streaming functionality', () => {
	it('should setup sendChunk handler when streaming is enabled and execution mode is not manual', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		const mockResponse = (0, jest_mock_extended_1.mock)();
		const data = (0, jest_mock_extended_1.mock)({
			workflowData: { nodes: [] },
			executionData: undefined,
			executionMode: 'webhook',
			streamingEnabled: true,
			httpResponse: mockResponse,
		});
		const mockHooks = (0, jest_mock_extended_1.mock)();
		jest
			.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain')
			.mockReturnValue(mockHooks);
		const mockAdditionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);
		const manualExecutionService = di_1.Container.get(
			manual_execution_service_1.ManualExecutionService,
		);
		jest.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		await runner.run(data);
		expect(mockHooks.addHandler).toHaveBeenCalledWith('sendChunk', expect.any(Function));
	});
	it('should setup sendChunk handler when streaming is enabled and execution mode is manual', async () => {
		const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
		jest.spyOn(activeExecutions, 'add').mockResolvedValue('1');
		jest.spyOn(activeExecutions, 'attachWorkflowExecution').mockReturnValueOnce();
		const permissionChecker = di_1.Container.get(
			pre_execution_checks_1.CredentialsPermissionChecker,
		);
		jest.spyOn(permissionChecker, 'check').mockResolvedValueOnce();
		const mockResponse = (0, jest_mock_extended_1.mock)();
		const data = (0, jest_mock_extended_1.mock)({
			workflowData: { nodes: [] },
			executionData: undefined,
			executionMode: 'manual',
			streamingEnabled: true,
			httpResponse: mockResponse,
		});
		const mockHooks = (0, jest_mock_extended_1.mock)();
		jest
			.spyOn(ExecutionLifecycleHooks, 'getLifecycleHooksForRegularMain')
			.mockReturnValue(mockHooks);
		const mockAdditionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(mockAdditionalData);
		const manualExecutionService = di_1.Container.get(
			manual_execution_service_1.ManualExecutionService,
		);
		jest.spyOn(manualExecutionService, 'runManually').mockReturnValue(
			new p_cancelable_1.default(() => {
				return (0, jest_mock_extended_1.mock)();
			}),
		);
		await runner.run(data);
		expect(mockHooks.addHandler).toHaveBeenCalledWith('sendChunk', expect.any(Function));
	});
});
//# sourceMappingURL=workflow-runner.test.js.map
