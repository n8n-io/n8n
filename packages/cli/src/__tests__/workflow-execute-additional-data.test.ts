import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { ExternalSecretsProxy } from 'n8n-core';
import type {
	IWorkflowBase,
	IExecuteWorkflowInfo,
	IWorkflowExecuteAdditionalData,
	ExecuteWorkflowOptions,
	IRun,
	INodeExecutionData,
	INode,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { EventService } from '@/events/event.service';
import {
	CredentialsPermissionChecker,
	SubworkflowPolicyChecker,
} from '@/executions/pre-execution-checks';
import { ExternalHooks } from '@/external-hooks';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { UrlService } from '@/services/url.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { Telemetry } from '@/telemetry';
import {
	executeWorkflow,
	getBase,
	getRunData,
	getWorkflowData,
} from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';

const EXECUTION_ID = '123';
const LAST_NODE_EXECUTED = 'Last node executed';

const getMockRun = ({ lastNodeOutput }: { lastNodeOutput: Array<INodeExecutionData[] | null> }) =>
	mock<IRun>({
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

const getCancelablePromise = async (run: IRun) =>
	await mock<PCancelable<IRun>>({
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
	const variablesService = mockInstance(VariablesService);
	variablesService.getAllCached.mockResolvedValue([]);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const externalSecretsProxy = mockInstance(ExternalSecretsProxy);
	const eventService = mockInstance(EventService);
	mockInstance(ExternalHooks);
	Container.set(VariablesService, variablesService);
	Container.set(CredentialsHelper, credentialsHelper);
	Container.set(ExternalSecretsProxy, externalSecretsProxy);
	const executionRepository = mockInstance(ExecutionRepository);
	mockInstance(Telemetry);
	const workflowRepository = mockInstance(WorkflowRepository);
	const activeExecutions = mockInstance(ActiveExecutions);
	mockInstance(CredentialsPermissionChecker);
	mockInstance(SubworkflowPolicyChecker);
	mockInstance(WorkflowStatisticsService);
	mockInstance(DataTableProxyService);

	const urlService = mockInstance(UrlService);
	Container.set(UrlService, urlService);

	test('logAiEvent should call MessageEventBus', async () => {
		const additionalData = await getBase({ userId: 'user-id', workflowId: 'workflow-id' });

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
				mock<WorkflowEntity>({
					id: EXECUTION_ID,
					name: 'Test Workflow',
					active: false,
					activeVersionId: null,
					activeVersion: null,
					nodes: [],
					connections: {},
				}),
			);
			activeExecutions.add.mockResolvedValue(EXECUTION_ID);
			processRunExecutionData.mockReturnValue(getCancelablePromise(runWithData));
		});

		it('should execute workflow, return data and execution id', async () => {
			const response = await executeWorkflow(
				mock<IExecuteWorkflowInfo>(),
				mock<IWorkflowExecuteAdditionalData>(),
				mock<ExecuteWorkflowOptions>({ loadedWorkflowData: undefined, doNotWaitToFinish: false }),
			);

			expect(response).toEqual({
				data: runWithData.data.resultData.runData[LAST_NODE_EXECUTED][0].data!.main,
				executionId: EXECUTION_ID,
			});
		});

		it('should execute workflow, skip waiting', async () => {
			const response = await executeWorkflow(
				mock<IExecuteWorkflowInfo>(),
				mock<IWorkflowExecuteAdditionalData>(),
				mock<ExecuteWorkflowOptions>({ loadedWorkflowData: undefined, doNotWaitToFinish: true }),
			);

			expect(response).toEqual({
				data: [null],
				executionId: EXECUTION_ID,
			});
		});

		it('should set sub workflow execution as running', async () => {
			await executeWorkflow(
				mock<IExecuteWorkflowInfo>(),
				mock<IWorkflowExecuteAdditionalData>(),
				mock<ExecuteWorkflowOptions>({ loadedWorkflowData: undefined }),
			);

			expect(executionRepository.setRunning).toHaveBeenCalledWith(EXECUTION_ID);
		});

		it('should return waitTill property when workflow execution is waiting', async () => {
			const waitTill = new Date();
			runWithData.waitTill = waitTill;

			const response = await executeWorkflow(
				mock<IExecuteWorkflowInfo>(),
				mock<IWorkflowExecuteAdditionalData>(),
				mock<ExecuteWorkflowOptions>({ loadedWorkflowData: undefined, doNotWaitToFinish: false }),
			);

			expect(response).toEqual({
				data: runWithData.data.resultData.runData[LAST_NODE_EXECUTED][0].data!.main,
				executionId: EXECUTION_ID,
				waitTill,
			});
		});
	});

	describe('getRunData', () => {
		it('should throw error to add trigger ndoe', () => {
			const workflow = mock<IWorkflowBase>({
				id: '1',
				name: 'test',
				nodes: [],
				active: false,
			});

			expect(() => getRunData(workflow)).toThrowError('Missing node to start execution');
		});

		const workflow = mock<IWorkflowBase>({
			id: '1',
			name: 'test',
			nodes: [
				{
					type: 'n8n-nodes-base.executeWorkflowTrigger',
				},
			],
			active: false,
		});

		it('should return default data', () => {
			expect(getRunData(workflow)).toEqual({
				executionData: createRunExecutionData({
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
					resultData: {
						error: undefined,
						lastNodeExecuted: undefined,
						metadata: undefined,
						pinData: undefined,
						runData: {},
					},
					startData: {},
				}),
				executionMode: 'integrated',
				workflowData: workflow,
			});
		});

		it('should return run data with input data and metadata', () => {
			const data = [{ json: { test: 1 } }];
			const parentExecution = {
				executionId: '123',
				workflowId: '567',
			};
			expect(getRunData(workflow, data, parentExecution)).toEqual({
				executionData: createRunExecutionData({
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
				}),
				executionMode: 'integrated',
				workflowData: workflow,
			});
		});
	});

	describe('getWorkflowData', () => {
		beforeEach(() => {
			workflowRepository.get.mockClear();
		});

		it('should load and use active version when workflow is active', async () => {
			const activeVersionNodes: INode[] = [
				mock<INode>({
					id: 'active-node',
					type: 'n8n-nodes-base.set',
					name: 'Active Node',
					typeVersion: 1,
					parameters: {},
					position: [250, 300],
				}),
			];
			const activeVersionConnections = { 'Active Node': {} };
			const currentNodes: INode[] = [
				mock<INode>({
					id: 'current-node',
					type: 'n8n-nodes-base.set',
					name: 'Current Node',
					typeVersion: 1,
					parameters: {},
					position: [250, 300],
				}),
			];
			const currentConnections = { 'Current Node': {} };

			workflowRepository.get.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'workflow-123',
					name: 'Test Workflow',
					active: true,
					activeVersionId: 'version-456',
					nodes: currentNodes,
					connections: currentConnections,
					activeVersion: mock({
						versionId: 'version-456',
						workflowId: 'workflow-123',
						nodes: activeVersionNodes,
						connections: activeVersionConnections,
						authors: 'user1',
						createdAt: new Date(),
						updatedAt: new Date(),
					}),
				}),
			);

			const result = await getWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			expect(result.nodes).toEqual(activeVersionNodes);
			expect(result.connections).toEqual(activeVersionConnections);
			expect(workflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-123' },
				{ relations: ['activeVersion', 'tags'] },
			);
		});

		it('should use current version when workflow has no active version', async () => {
			const currentNodes: INode[] = [
				mock<INode>({
					id: 'current-node',
					type: 'n8n-nodes-base.set',
					name: 'Current Node',
					typeVersion: 1,
					parameters: {},
					position: [250, 300],
				}),
			];
			const currentConnections = { 'Current Node': {} };

			workflowRepository.get.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'workflow-123',
					name: 'Test Workflow',
					active: false,
					activeVersionId: null,
					nodes: currentNodes,
					connections: currentConnections,
					activeVersion: null,
				}),
			);

			const result = await getWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			expect(result.nodes).toEqual(currentNodes);
			expect(result.connections).toEqual(currentConnections);
		});

		it('should load activeVersion relation when tags are disabled', async () => {
			const globalConfig = Container.get(GlobalConfig);
			globalConfig.tags.disabled = true;

			workflowRepository.get.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'workflow-123',
					active: false,
					activeVersionId: null,
					nodes: [],
					connections: {},
					activeVersion: null,
				}),
			);

			await getWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			expect(workflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-123' },
				{ relations: ['activeVersion'] },
			);

			globalConfig.tags.disabled = false;
		});

		it('should throw error when workflow does not exist', async () => {
			workflowRepository.get.mockResolvedValue(null);

			await expect(getWorkflowData({ id: 'non-existent' }, 'parent-workflow-id')).rejects.toThrow(
				'Workflow does not exist',
			);
		});

		it('should use provided workflow code when id is not provided', async () => {
			const workflowCode = mock<IWorkflowBase>({
				id: 'code-workflow',
				name: 'Code Workflow',
				active: false,
				nodes: [
					mock<INode>({
						id: 'node1',
						type: 'n8n-nodes-base.set',
						name: 'Node 1',
						typeVersion: 1,
						parameters: {},
						position: [250, 300],
					}),
				],
				connections: {},
			});

			const result = await getWorkflowData({ code: workflowCode }, 'parent-workflow-id');

			expect(result).toEqual(workflowCode);
			expect(workflowRepository.get).not.toHaveBeenCalled();
		});

		it('should set parent workflow settings when not provided in code', async () => {
			const workflowCode = mock<IWorkflowBase>({
				id: 'code-workflow',
				name: 'Code Workflow',
				active: false,
				nodes: [],
				connections: {},
				settings: undefined,
			});
			const parentSettings = { executionOrder: 'v1' as const };

			const result = await getWorkflowData(
				{ code: workflowCode },
				'parent-workflow-id',
				parentSettings,
			);

			expect(result.settings).toEqual(parentSettings);
		});
	});

	describe('getBase', () => {
		const mockWebhookBaseUrl = 'webhook-base-url.com';
		jest.spyOn(urlService, 'getWebhookBaseUrl').mockReturnValue(mockWebhookBaseUrl);

		const globalConfig = mockInstance(GlobalConfig);
		Container.set(GlobalConfig, globalConfig);
		globalConfig.endpoints = mock<GlobalConfig['endpoints']>({
			rest: '/rest/',
			formWaiting: '/form-waiting/',
			webhook: '/webhook/',
			webhookWaiting: '/webhook-waiting/',
			webhookTest: '/webhook-test/',
		});

		const mockVariables = { variable: 1 };
		jest.spyOn(WorkflowHelpers, 'getVariables').mockResolvedValue(mockVariables);

		it('should return base additional data with default values', async () => {
			const additionalData = await getBase();

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
			const additionalData = await getBase({ userId });

			expect(additionalData.userId).toBe(userId);
		});

		it('should include currentNodeParameters when provided', async () => {
			const currentNodeParameters = { param1: 'value1' };
			const additionalData = await getBase({ currentNodeParameters });

			expect(additionalData.currentNodeParameters).toBe(currentNodeParameters);
		});

		it('should include executionTimeoutTimestamp when provided', async () => {
			const executionTimeoutTimestamp = Date.now() + 1000;
			const additionalData = await getBase({
				executionTimeoutTimestamp,
			});

			expect(additionalData.executionTimeoutTimestamp).toBe(executionTimeoutTimestamp);
		});
	});
});
