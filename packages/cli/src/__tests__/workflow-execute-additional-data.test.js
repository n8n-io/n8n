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
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const active_executions_1 = require('@/active-executions');
const credentials_helper_1 = require('@/credentials-helper');
const variables_service_ee_1 = require('@/environments.ee/variables/variables.service.ee');
const event_service_1 = require('@/events/event.service');
const pre_execution_checks_1 = require('@/executions/pre-execution-checks');
const external_hooks_1 = require('@/external-hooks');
const url_service_1 = require('@/services/url.service');
const workflow_statistics_service_1 = require('@/services/workflow-statistics.service');
const telemetry_1 = require('@/telemetry');
const workflow_execute_additional_data_1 = require('@/workflow-execute-additional-data');
const WorkflowHelpers = __importStar(require('@/workflow-helpers'));
const EXECUTION_ID = '123';
const LAST_NODE_EXECUTED = 'Last node executed';
const getMockRun = ({ lastNodeOutput }) =>
	(0, jest_mock_extended_1.mock)({
		data: {
			resultData: {
				runData: {
					[LAST_NODE_EXECUTED]: [
						{
							startTime: 100,
							data: {
								main: lastNodeOutput,
							},
						},
					],
				},
				lastNodeExecuted: LAST_NODE_EXECUTED,
			},
		},
		finished: true,
		mode: 'manual',
		startedAt: new Date(),
		status: 'new',
		waitTill: undefined,
	});
const getCancelablePromise = async (run) =>
	await (0, jest_mock_extended_1.mock)({
		then: jest
			.fn()
			.mockImplementation(async (onfulfilled) => await Promise.resolve(run).then(onfulfilled)),
		catch: jest
			.fn()
			.mockImplementation(async (onrejected) => await Promise.resolve(run).catch(onrejected)),
		finally: jest
			.fn()
			.mockImplementation(async (onfinally) => await Promise.resolve(run).finally(onfinally)),
		[Symbol.toStringTag]: 'PCancelable',
	});
const processRunExecutionData = jest.fn();
jest.mock('n8n-core', () => ({
	__esModule: true,
	...jest.requireActual('n8n-core'),
	WorkflowExecute: jest.fn().mockImplementation(() => ({
		processRunExecutionData,
	})),
}));
describe('WorkflowExecuteAdditionalData', () => {
	const variablesService = (0, backend_test_utils_1.mockInstance)(
		variables_service_ee_1.VariablesService,
	);
	variablesService.getAllCached.mockResolvedValue([]);
	const credentialsHelper = (0, backend_test_utils_1.mockInstance)(
		credentials_helper_1.CredentialsHelper,
	);
	const externalSecretsProxy = (0, backend_test_utils_1.mockInstance)(
		n8n_core_1.ExternalSecretsProxy,
	);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	(0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	di_1.Container.set(variables_service_ee_1.VariablesService, variablesService);
	di_1.Container.set(credentials_helper_1.CredentialsHelper, credentialsHelper);
	di_1.Container.set(n8n_core_1.ExternalSecretsProxy, externalSecretsProxy);
	const executionRepository = (0, backend_test_utils_1.mockInstance)(db_1.ExecutionRepository);
	(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
	const workflowRepository = (0, backend_test_utils_1.mockInstance)(db_1.WorkflowRepository);
	const activeExecutions = (0, backend_test_utils_1.mockInstance)(
		active_executions_1.ActiveExecutions,
	);
	(0, backend_test_utils_1.mockInstance)(pre_execution_checks_1.CredentialsPermissionChecker);
	(0, backend_test_utils_1.mockInstance)(pre_execution_checks_1.SubworkflowPolicyChecker);
	(0, backend_test_utils_1.mockInstance)(workflow_statistics_service_1.WorkflowStatisticsService);
	const urlService = (0, backend_test_utils_1.mockInstance)(url_service_1.UrlService);
	di_1.Container.set(url_service_1.UrlService, urlService);
	test('logAiEvent should call MessageEventBus', async () => {
		const additionalData = await (0, workflow_execute_additional_data_1.getBase)('user-id');
		const eventName = 'ai-messages-retrieved-from-memory';
		const payload = {
			msg: 'test message',
			executionId: '123',
			nodeName: 'n8n-memory',
			workflowId: 'workflow-id',
			workflowName: 'workflow-name',
			nodeType: 'n8n-memory',
		};
		additionalData.logAiEvent(eventName, payload);
		expect(eventService.emit).toHaveBeenCalledTimes(1);
		expect(eventService.emit).toHaveBeenCalledWith(eventName, payload);
	});
	describe('executeWorkflow', () => {
		const runWithData = getMockRun({
			lastNodeOutput: [[{ json: { test: 1 } }]],
		});
		beforeEach(() => {
			workflowRepository.get.mockResolvedValue(
				(0, jest_mock_extended_1.mock)({ id: EXECUTION_ID, nodes: [] }),
			);
			activeExecutions.add.mockResolvedValue(EXECUTION_ID);
			processRunExecutionData.mockReturnValue(getCancelablePromise(runWithData));
		});
		it('should execute workflow, return data and execution id', async () => {
			const response = await (0, workflow_execute_additional_data_1.executeWorkflow)(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ loadedWorkflowData: undefined, doNotWaitToFinish: false }),
			);
			expect(response).toEqual({
				data: runWithData.data.resultData.runData[LAST_NODE_EXECUTED][0].data.main,
				executionId: EXECUTION_ID,
			});
		});
		it('should execute workflow, skip waiting', async () => {
			const response = await (0, workflow_execute_additional_data_1.executeWorkflow)(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ loadedWorkflowData: undefined, doNotWaitToFinish: true }),
			);
			expect(response).toEqual({
				data: [null],
				executionId: EXECUTION_ID,
			});
		});
		it('should set sub workflow execution as running', async () => {
			await (0, workflow_execute_additional_data_1.executeWorkflow)(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ loadedWorkflowData: undefined }),
			);
			expect(executionRepository.setRunning).toHaveBeenCalledWith(EXECUTION_ID);
		});
		it('should return waitTill property when workflow execution is waiting', async () => {
			const waitTill = new Date();
			runWithData.waitTill = waitTill;
			const response = await (0, workflow_execute_additional_data_1.executeWorkflow)(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ loadedWorkflowData: undefined, doNotWaitToFinish: false }),
			);
			expect(response).toEqual({
				data: runWithData.data.resultData.runData[LAST_NODE_EXECUTED][0].data.main,
				executionId: EXECUTION_ID,
				waitTill,
			});
		});
	});
	describe('getRunData', () => {
		it('should throw error to add trigger ndoe', async () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				id: '1',
				name: 'test',
				nodes: [],
				active: false,
			});
			await expect(
				(0, workflow_execute_additional_data_1.getRunData)(workflow),
			).rejects.toThrowError('Missing node to start execution');
		});
		const workflow = (0, jest_mock_extended_1.mock)({
			id: '1',
			name: 'test',
			nodes: [
				{
					type: 'n8n-nodes-base.executeWorkflowTrigger',
				},
			],
			active: false,
		});
		it('should return default data', async () => {
			expect(await (0, workflow_execute_additional_data_1.getRunData)(workflow)).toEqual({
				executionData: {
					executionData: {
						contextData: {},
						metadata: {},
						nodeExecutionStack: [
							{
								data: { main: [[{ json: {} }]] },
								metadata: { parentExecution: undefined },
								node: workflow.nodes[0],
								source: null,
							},
						],
						waitingExecution: {},
						waitingExecutionSource: {},
					},
					resultData: { runData: {} },
					startData: {},
				},
				executionMode: 'integrated',
				workflowData: workflow,
			});
		});
		it('should return run data with input data and metadata', async () => {
			const data = [{ json: { test: 1 } }];
			const parentExecution = {
				executionId: '123',
				workflowId: '567',
			};
			expect(
				await (0, workflow_execute_additional_data_1.getRunData)(workflow, data, parentExecution),
			).toEqual({
				executionData: {
					executionData: {
						contextData: {},
						metadata: {},
						nodeExecutionStack: [
							{
								data: { main: [data] },
								metadata: { parentExecution },
								node: workflow.nodes[0],
								source: null,
							},
						],
						waitingExecution: {},
						waitingExecutionSource: {},
					},
					parentExecution: {
						executionId: '123',
						workflowId: '567',
					},
					resultData: { runData: {} },
					startData: {},
				},
				executionMode: 'integrated',
				workflowData: workflow,
			});
		});
	});
	describe('getBase', () => {
		const mockWebhookBaseUrl = 'webhook-base-url.com';
		jest.spyOn(urlService, 'getWebhookBaseUrl').mockReturnValue(mockWebhookBaseUrl);
		const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig);
		di_1.Container.set(config_1.GlobalConfig, globalConfig);
		globalConfig.endpoints = (0, jest_mock_extended_1.mock)({
			rest: '/rest/',
			formWaiting: '/form-waiting/',
			webhook: '/webhook/',
			webhookWaiting: '/webhook-waiting/',
			webhookTest: '/webhook-test/',
		});
		const mockVariables = { variable: 1 };
		jest.spyOn(WorkflowHelpers, 'getVariables').mockResolvedValue(mockVariables);
		it('should return base additional data with default values', async () => {
			const additionalData = await (0, workflow_execute_additional_data_1.getBase)();
			expect(additionalData).toMatchObject({
				currentNodeExecutionIndex: 0,
				credentialsHelper,
				executeWorkflow: expect.any(Function),
				restApiUrl: `${mockWebhookBaseUrl}/rest/`,
				instanceBaseUrl: mockWebhookBaseUrl,
				formWaitingBaseUrl: `${mockWebhookBaseUrl}/form-waiting/`,
				webhookBaseUrl: `${mockWebhookBaseUrl}/webhook/`,
				webhookWaitingBaseUrl: `${mockWebhookBaseUrl}/webhook-waiting/`,
				webhookTestBaseUrl: `${mockWebhookBaseUrl}/webhook-test/`,
				currentNodeParameters: undefined,
				executionTimeoutTimestamp: undefined,
				userId: undefined,
				setExecutionStatus: expect.any(Function),
				variables: mockVariables,
				externalSecretsProxy,
				startRunnerTask: expect.any(Function),
				logAiEvent: expect.any(Function),
			});
		});
		it('should include userId when provided', async () => {
			const userId = 'test-user-id';
			const additionalData = await (0, workflow_execute_additional_data_1.getBase)(userId);
			expect(additionalData.userId).toBe(userId);
		});
		it('should include currentNodeParameters when provided', async () => {
			const currentNodeParameters = { param1: 'value1' };
			const additionalData = await (0, workflow_execute_additional_data_1.getBase)(
				undefined,
				currentNodeParameters,
			);
			expect(additionalData.currentNodeParameters).toBe(currentNodeParameters);
		});
		it('should include executionTimeoutTimestamp when provided', async () => {
			const executionTimeoutTimestamp = Date.now() + 1000;
			const additionalData = await (0, workflow_execute_additional_data_1.getBase)(
				undefined,
				undefined,
				executionTimeoutTimestamp,
			);
			expect(additionalData.executionTimeoutTimestamp).toBe(executionTimeoutTimestamp);
		});
	});
});
//# sourceMappingURL=workflow-execute-additional-data.test.js.map
