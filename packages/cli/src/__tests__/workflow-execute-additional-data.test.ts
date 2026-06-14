import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { WorkflowEntity, User, Project } from '@n8n/db';
import {
	ExecutionRepository,
	ExecutionDataRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
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
	ITaskData,
	WorkflowExecuteMode,
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
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExternalHooks } from '@/external-hooks';
import { AgentsService } from '@/modules/agents/agents.service';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { OwnershipService } from '@/services/ownership.service';
import { UrlService } from '@/services/url.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { Telemetry } from '@/telemetry';
import {
	executeAgent,
	executeWorkflow,
	getBase,
	getRunData,
	getDraftWorkflowData,
	getPublishedWorkflowData,
	buildSubWorkflowOutput,
	triggerReturnsLastRunOnly,
} from '@/workflow-execute-additional-data';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';

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
	mockInstance(ExecutionPersistence);
	mockInstance(ExecutionDataRepository);
	mockInstance(Telemetry);
	const workflowRepository = mockInstance(WorkflowRepository);
	const activeExecutions = mockInstance(ActiveExecutions);
	mockInstance(CredentialsPermissionChecker);
	mockInstance(SubworkflowPolicyChecker);
	mockInstance(WorkflowStatisticsService);
	mockInstance(WorkflowPublishHistoryRepository);
	mockInstance(DataTableProxyService);
	mockInstance(WorkflowHookContextService);

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
					active: true,
					activeVersionId: 'active-version-id',
					activeVersion: {
						nodes: [],
						connections: {},
					},
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

		it('should pass workflowId to getBase when executing subworkflow', async () => {
			const getVariablesSpy = jest.spyOn(WorkflowHelpers, 'getVariables');
			const workflowId = 'test-workflow-123';

			const workflowWithId = mock<WorkflowEntity>({
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'active-version-id',
				activeVersion: {
					nodes: [],
					connections: {},
				},
				nodes: [],
				connections: {},
			});

			workflowRepository.get.mockResolvedValueOnce(workflowWithId);

			await executeWorkflow(
				mock<IExecuteWorkflowInfo>({ id: workflowId }),
				mock<IWorkflowExecuteAdditionalData>(),
				mock<ExecuteWorkflowOptions>({ loadedWorkflowData: undefined, doNotWaitToFinish: false }),
			);

			expect(getVariablesSpy).toHaveBeenCalledWith(workflowId, undefined);
		});

		/**
		 * Tests for workflow version selection based on execution mode.
		 *
		 * Note: These tests verify that executeWorkflow accepts different execution modes.
		 * The actual version selection logic (draft vs published) is tested in detail in the
		 * getDraftWorkflowData and getPublishedWorkflowData test suites below.
		 */
		describe('workflow version selection based on execution mode', () => {
			const mockWorkflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			});

			it('should execute successfully with manual execution mode (uses draft version, includes test webhooks)', async () => {
				const result = await executeWorkflow(
					mock<IExecuteWorkflowInfo>({ id: 'workflow-123' }),
					mock<IWorkflowExecuteAdditionalData>(),
					mock<ExecuteWorkflowOptions>({
						loadedWorkflowData: mockWorkflowData,
						executionMode: 'manual',
						parentWorkflowId: 'parent-123',
					}),
				);

				expect(result.executionId).toBe(EXECUTION_ID);
				expect(result.data).toBeDefined();
			});

			it('should execute successfully with chat execution mode (uses draft version)', async () => {
				const result = await executeWorkflow(
					mock<IExecuteWorkflowInfo>({ id: 'workflow-123' }),
					mock<IWorkflowExecuteAdditionalData>(),
					mock<ExecuteWorkflowOptions>({
						loadedWorkflowData: mockWorkflowData,
						executionMode: 'chat',
						parentWorkflowId: 'parent-123',
					}),
				);

				expect(result.executionId).toBe(EXECUTION_ID);
				expect(result.data).toBeDefined();
			});

			it('should execute successfully with trigger execution mode (uses published version)', async () => {
				const result = await executeWorkflow(
					mock<IExecuteWorkflowInfo>({ id: 'workflow-123' }),
					mock<IWorkflowExecuteAdditionalData>(),
					mock<ExecuteWorkflowOptions>({
						loadedWorkflowData: mockWorkflowData,
						executionMode: 'trigger',
						parentWorkflowId: 'parent-123',
					}),
				);

				expect(result.executionId).toBe(EXECUTION_ID);
				expect(result.data).toBeDefined();
			});

			it('should execute successfully with webhook execution mode (uses published version for production webhooks)', async () => {
				const result = await executeWorkflow(
					mock<IExecuteWorkflowInfo>({ id: 'workflow-123' }),
					mock<IWorkflowExecuteAdditionalData>(),
					mock<ExecuteWorkflowOptions>({
						loadedWorkflowData: mockWorkflowData,
						executionMode: 'webhook',
						parentWorkflowId: 'parent-123',
					}),
				);

				expect(result.executionId).toBe(EXECUTION_ID);
				expect(result.data).toBeDefined();
			});

			it('should execute successfully with integrated execution mode (uses published version)', async () => {
				const result = await executeWorkflow(
					mock<IExecuteWorkflowInfo>({ id: 'workflow-123' }),
					mock<IWorkflowExecuteAdditionalData>(),
					mock<ExecuteWorkflowOptions>({
						loadedWorkflowData: mockWorkflowData,
						executionMode: 'integrated',
						parentWorkflowId: 'parent-123',
					}),
				);

				expect(result.executionId).toBe(EXECUTION_ID);
				expect(result.data).toBeDefined();
			});
		});

		describe('sub-workflow execution timeouts', () => {
			const now = Date.now();
			const getDeadlineFromNow = (offsetSeconds: number) => now + offsetSeconds * 1000;
			const WorkflowExecuteMock: jest.Mock = jest.requireMock('n8n-core').WorkflowExecute;

			let dateSpy: jest.SpyInstance;
			beforeEach(() => {
				dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
				WorkflowExecuteMock.mockClear();
			});
			afterEach(() => {
				dateSpy.mockRestore();
			});

			const getSubWorkflowDeadline = () =>
				(WorkflowExecuteMock.mock.calls[0][0] as IWorkflowExecuteAdditionalData)
					.executionTimeoutTimestamp;

			const executeWorkflowWithTimeout = async (opts: {
				doNotWaitToFinish: boolean;
				subTimeout?: number;
				parentDeadline?: number;
				globalTimeout?: number;
				globalMaxTimeout?: number;
			}) => {
				Container.set(ExecutionsConfig, {
					timeout: opts.globalTimeout ?? -1,
					maxTimeout: opts.globalMaxTimeout ?? 3600,
				} as ExecutionsConfig);

				await executeWorkflow(
					mock<IExecuteWorkflowInfo>(),
					mock<IWorkflowExecuteAdditionalData>({ executionTimeoutTimestamp: opts.parentDeadline }),
					mock<ExecuteWorkflowOptions>({
						loadedWorkflowData: mock<IWorkflowBase>({
							id: 'sub-id',
							name: 'Sub Workflow',
							nodes: [],
							connections: {},
							// Pass executionTimeout through even when undefined so jest-mock-extended
							// keeps it as a real `undefined` rather than auto-mocking it into a function.
							settings: { executionTimeout: opts.subTimeout },
						}),
						doNotWaitToFinish: opts.doNotWaitToFinish,
					}),
				);

				if (opts.doNotWaitToFinish) {
					await new Promise(setImmediate);
				}
			};

			describe('doNotWaitToFinish: false (parent waits for sub-workflow result)', () => {
				it('should use parent deadline when sub-workflow timeout exceeds it', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: 120,
						parentDeadline: getDeadlineFromNow(10),
						doNotWaitToFinish: false,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(10));
				});

				it('should use sub-workflow timeout when shorter than parent deadline', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: 5,
						parentDeadline: getDeadlineFromNow(60),
						doNotWaitToFinish: false,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(5));
				});

				it('should use sub-workflow timeout when parent has no deadline', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: 120,
						doNotWaitToFinish: false,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(120));
				});

				it('should cap sub-workflow timeout at global max timeout', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: 7200,
						parentDeadline: getDeadlineFromNow(7200),
						doNotWaitToFinish: false,
						globalMaxTimeout: 3600,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(3600));
				});

				it('should not cap sub-workflow timeout when global max timeout is disabled (<=0)', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: 7200,
						doNotWaitToFinish: false,
						globalMaxTimeout: -1,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(7200));
				});

				it('should cap the global default timeout at the global max timeout', async () => {
					await executeWorkflowWithTimeout({
						doNotWaitToFinish: false,
						globalTimeout: 20,
						globalMaxTimeout: 10,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(10));
				});

				it('should not cap the global default timeout when global max timeout is disabled (<=0)', async () => {
					await executeWorkflowWithTimeout({
						doNotWaitToFinish: false,
						globalTimeout: 600,
						globalMaxTimeout: -1,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(600));
				});

				it('should fall back to global default when sub-workflow has no timeout', async () => {
					await executeWorkflowWithTimeout({
						parentDeadline: getDeadlineFromNow(60),
						doNotWaitToFinish: false,
						globalTimeout: 30,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(30));
				});

				it('should use parent deadline when sub-workflow has no timeout, and global is unlimited', async () => {
					await executeWorkflowWithTimeout({
						parentDeadline: getDeadlineFromNow(10),
						doNotWaitToFinish: false,
						globalTimeout: -1,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(10));
				});

				it('should set no timeout when neither sub-workflow nor global timeout is set and parent has no deadline', async () => {
					await executeWorkflowWithTimeout({
						globalTimeout: -1,
						doNotWaitToFinish: false,
					});
					expect(getSubWorkflowDeadline()).toBeUndefined();
				});

				it('should ignore the global default timeout when the sub-workflow timeout is explicitly disabled (-1)', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: -1,
						doNotWaitToFinish: false,
						globalTimeout: 600,
					});
					expect(getSubWorkflowDeadline()).toBeUndefined();
				});

				it('should use parent deadline, not the global default, when the sub-workflow timeout is explicitly disabled (-1)', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: -1,
						parentDeadline: getDeadlineFromNow(60),
						doNotWaitToFinish: false,
						globalTimeout: 600,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(60));
				});
			});

			describe('doNotWaitToFinish: true (sub-workflow timeout independent of parent)', () => {
				it('should use sub-workflow own timeout regardless of parent deadline', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: 120,
						parentDeadline: getDeadlineFromNow(10),
						doNotWaitToFinish: true,
					});
					expect(getSubWorkflowDeadline()).toBe(getDeadlineFromNow(120));
				});

				it('should set no timeout when sub-workflow has no timeout and global timeout is unlimited', async () => {
					await executeWorkflowWithTimeout({
						parentDeadline: getDeadlineFromNow(10),
						doNotWaitToFinish: true,
						globalTimeout: -1,
					});
					expect(getSubWorkflowDeadline()).toBeUndefined();
				});

				it('should ignore the global default timeout when the sub-workflow timeout is explicitly disabled (-1)', async () => {
					await executeWorkflowWithTimeout({
						subTimeout: -1,
						parentDeadline: getDeadlineFromNow(10),
						doNotWaitToFinish: true,
						globalTimeout: 600,
					});
					expect(getSubWorkflowDeadline()).toBeUndefined();
				});
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
			const result = getRunData(workflow);
			expect(result).toEqual({
				executionData: createRunExecutionData({
					resumeToken: result.executionData?.resumeToken,
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
			const result = getRunData(workflow, data, parentExecution);
			expect(result).toEqual({
				executionData: createRunExecutionData({
					resumeToken: result.executionData?.resumeToken,
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

	describe('getPublishedWorkflowData', () => {
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

			const result = await getPublishedWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			expect(result.nodes).toEqual(activeVersionNodes);
			expect(result.connections).toEqual(activeVersionConnections);
			expect(workflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-123' },
				{ relations: ['activeVersion', 'tags'] },
			);
		});

		it('should throw error when workflow has no active version', async () => {
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
					activeVersionId: null,
					nodes: currentNodes,
					connections: currentConnections,
					activeVersion: null,
				}),
			);

			await expect(
				getPublishedWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id'),
			).rejects.toThrow('Workflow is not active and cannot be executed.');
		});

		it('should load activeVersion relation when tags are disabled', async () => {
			const globalConfig = Container.get(GlobalConfig);
			globalConfig.tags.disabled = true;

			workflowRepository.get.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'workflow-123',
					active: true,
					activeVersionId: 'active-version-id',
					nodes: [],
					connections: {},
					activeVersion: {
						nodes: [],
						connections: {},
					},
				}),
			);

			await getPublishedWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			expect(workflowRepository.get).toHaveBeenCalledWith(
				{ id: 'workflow-123' },
				{ relations: ['activeVersion'] },
			);

			globalConfig.tags.disabled = false;
		});

		it('should throw error when workflow does not exist', async () => {
			workflowRepository.get.mockResolvedValue(null);

			await expect(
				getPublishedWorkflowData({ id: 'non-existent' }, 'parent-workflow-id'),
			).rejects.toThrow('Workflow does not exist');
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

			const result = await getPublishedWorkflowData({ code: workflowCode }, 'parent-workflow-id');

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

			const result = await getPublishedWorkflowData(
				{ code: workflowCode },
				'parent-workflow-id',
				parentSettings,
			);

			expect(result.settings).toEqual(parentSettings);
		});
	});

	describe('getDraftWorkflowData', () => {
		beforeEach(() => {
			workflowRepository.get.mockClear();
		});

		it('should use draft version', async () => {
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
			const draftNodes: INode[] = [
				mock<INode>({
					id: 'draft-node',
					type: 'n8n-nodes-base.set',
					name: 'Draft Node',
					typeVersion: 1,
					parameters: {},
					position: [250, 300],
				}),
			];
			const draftConnections = { 'Draft Node': {} };

			workflowRepository.get.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'workflow-123',
					name: 'Test Workflow',
					active: true,
					activeVersionId: 'version-456',
					nodes: draftNodes,
					connections: draftConnections,
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

			const result = await getDraftWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			// Should use draft nodes/connections, not active version
			expect(result.nodes).toEqual(draftNodes);
			expect(result.connections).toEqual(draftConnections);
		});

		it('should allow draft workflow without active version', async () => {
			const draftNodes: INode[] = [
				mock<INode>({
					id: 'draft-node',
					type: 'n8n-nodes-base.set',
					name: 'Draft Node',
					typeVersion: 1,
					parameters: {},
					position: [250, 300],
				}),
			];
			const draftConnections = { 'Draft Node': {} };

			workflowRepository.get.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'workflow-123',
					name: 'Test Workflow',
					active: false,
					activeVersionId: null,
					nodes: draftNodes,
					connections: draftConnections,
					activeVersion: null,
				}),
			);

			const result = await getDraftWorkflowData({ id: 'workflow-123' }, 'parent-workflow-id');

			// Should use draft nodes/connections even without active version
			expect(result.nodes).toEqual(draftNodes);
			expect(result.connections).toEqual(draftConnections);
		});
	});

	describe('getBase', () => {
		const mockWebhookBaseUrl = 'https://webhook.example.com/';
		const mockInstanceBaseUrl = 'https://editor.example.com';

		const globalConfig = mockInstance(GlobalConfig);
		Container.set(GlobalConfig, globalConfig);

		const mockVariables = { variable: 1 };

		beforeEach(() => {
			jest.spyOn(urlService, 'getWebhookBaseUrl').mockReturnValue(mockWebhookBaseUrl);
			jest.spyOn(urlService, 'getInstanceBaseUrl').mockReturnValue(mockInstanceBaseUrl);
			globalConfig.endpoints = mock<GlobalConfig['endpoints']>({
				rest: '/rest/',
				formWaiting: '/form-waiting/',
				webhook: '/webhook/',
				webhookWaiting: '/webhook-waiting/',
				webhookTest: '/webhook-test/',
			});
			jest.spyOn(WorkflowHelpers, 'getVariables').mockResolvedValue(mockVariables);
		});

		it('should return base additional data with default values', async () => {
			const additionalData = await getBase();

			expect(additionalData).toMatchObject({
				currentNodeExecutionIndex: 0,
				credentialsHelper,
				executeWorkflow: expect.any(Function),
				restApiUrl: `${mockWebhookBaseUrl}/rest/`,
				instanceBaseUrl: `${mockInstanceBaseUrl}/`,
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

		it('should include workflowSettings when provided', async () => {
			const workflowSettings = {
				executionTimeout: 300,
				credentialResolverId: 'test-resolver-123',
			};
			const additionalData = await getBase({
				workflowSettings,
			});

			expect(additionalData.workflowSettings).toBe(workflowSettings);
		});
	});

	describe('executeAgent', () => {
		const ownershipService = mockInstance(OwnershipService);
		const agentsService = mockInstance(AgentsService);

		const AGENT_ID = 'agent-id';
		const MESSAGE = 'hello';
		const EXEC_ID = 'exec-id';
		const THREAD_ID = 'thread-id';

		beforeEach(() => {
			jest.clearAllMocks();
			agentsService.executeForWorkflow.mockResolvedValue(
				mock<Awaited<ReturnType<typeof agentsService.executeForWorkflow>>>(),
			);
		});

		it('uses userId and projectId from additionalData when both are present', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: 'user-1',
				projectId: 'project-1',
				workflowId: 'workflow-1',
			});

			await executeAgent(AGENT_ID, MESSAGE, EXEC_ID, THREAD_ID, additionalData, 'manual');

			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
			expect(ownershipService.getPersonalProjectOwnerCached).not.toHaveBeenCalled();
			expect(agentsService.executeForWorkflow).toHaveBeenCalledWith(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				'user-1',
				'project-1',
				'user-1',
				true,
				undefined,
			);
		});

		it('forwards the outputSchema to executeForWorkflow', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: 'user-1',
				projectId: 'project-1',
				workflowId: 'workflow-1',
			});
			const outputSchema = {
				type: 'object' as const,
				properties: { answer: { type: 'string' as const } },
				required: ['answer'],
			};

			await executeAgent(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				additionalData,
				'manual',
				outputSchema,
			);

			expect(agentsService.executeForWorkflow).toHaveBeenCalledWith(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				'user-1',
				'project-1',
				'user-1',
				true,
				outputSchema,
			);
		});

		it('backfills userId and projectId from the workflow owner when both are missing', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: undefined,
				projectId: undefined,
				workflowId: 'workflow-1',
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(
				mock<Project>({ id: 'project-1' }),
			);
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(
				mock<User>({ id: 'owner-1' }),
			);

			await executeAgent(AGENT_ID, MESSAGE, EXEC_ID, THREAD_ID, additionalData, 'manual');

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-1');
			expect(ownershipService.getPersonalProjectOwnerCached).toHaveBeenCalledWith('project-1');
			expect(agentsService.executeForWorkflow).toHaveBeenCalledWith(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				'owner-1',
				'project-1',
				undefined,
				true,
				undefined,
			);
		});

		it('throws when userId is missing and the workflow has no personal-project owner', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: undefined,
				projectId: undefined,
				workflowId: 'workflow-1',
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(
				mock<Project>({ id: 'project-1' }),
			);
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);

			await expect(
				executeAgent(AGENT_ID, MESSAGE, EXEC_ID, THREAD_ID, additionalData, 'manual'),
			).rejects.toThrow('Cannot execute agent without a userId in additional data');
			expect(agentsService.executeForWorkflow).not.toHaveBeenCalled();
		});

		it('throws when userId is missing and no workflowId is available to resolve ownership', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: undefined,
				projectId: undefined,
				workflowId: undefined,
			});

			await expect(
				executeAgent(AGENT_ID, MESSAGE, EXEC_ID, THREAD_ID, additionalData, 'manual'),
			).rejects.toThrow('Cannot execute agent without a userId in additional data');
			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		});

		it.each<WorkflowExecuteMode>(['manual', 'chat'])(
			'runs draft agent for %s executions',
			async (mode) => {
				const additionalData = mock<IWorkflowExecuteAdditionalData>({
					userId: 'user-1',
					projectId: 'project-1',
					workflowId: 'workflow-1',
				});

				await executeAgent(AGENT_ID, MESSAGE, EXEC_ID, THREAD_ID, additionalData, mode);

				// agentsService.executeForWorkflow should with 8th parameter true
				expect(agentsService.executeForWorkflow).toHaveBeenCalledWith(
					AGENT_ID,
					MESSAGE,
					EXEC_ID,
					THREAD_ID,
					'user-1',
					'project-1',
					'user-1',
					true,
					undefined,
				);
			},
		);

		it.each<WorkflowExecuteMode>([
			'cli',
			'error',
			'integrated',
			'internal',
			'retry',
			'trigger',
			'webhook',
			'evaluation',
			'agent',
		])('runs published agent for %s executions', async (mode) => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: 'user-1',
				projectId: 'project-1',
				workflowId: 'workflow-1',
			});

			await executeAgent(AGENT_ID, MESSAGE, EXEC_ID, THREAD_ID, additionalData, mode);

			// agentsService.executeForWorkflow should with 8th parameter true
			expect(agentsService.executeForWorkflow).toHaveBeenCalledWith(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				'user-1',
				'project-1',
				'user-1',
				false,
				undefined,
			);
		});
	});

	describe('buildSubWorkflowOutput', () => {
		const twoRunsOnTerminalNode: Record<string, ITaskData[]> = {
			[LAST_NODE_EXECUTED]: [
				{ data: { main: [[{ json: { itemId: 0 } }]] } },
				{ data: { main: [[{ json: { itemId: 1 } }, { json: { itemId: 2 } }]] } },
			] as unknown as ITaskData[],
		};

		function buildRun(overrides: {
			mode?: IRun['mode'];
			runData?: Record<string, ITaskData[]>;
			pinData?: Record<string, unknown>;
			lastNodeExecuted?: string;
		}): IRun {
			return {
				mode: overrides.mode ?? 'manual',
				data: {
					resultData: {
						runData: overrides.runData ?? twoRunsOnTerminalNode,
						pinData: overrides.pinData,
						lastNodeExecuted:
							overrides.lastNodeExecuted === undefined
								? LAST_NODE_EXECUTED
								: overrides.lastNodeExecuted,
					},
				},
				finished: true,
			} as unknown as IRun;
		}

		function trigger(typeVersion: number, returnOutput?: string): INode {
			return mock<INode>({
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion,
				parameters: returnOutput === undefined ? {} : { returnOutput },
			});
		}

		const expectedItemsFromBothRunsConcatenated = [
			[{ json: { itemId: 0 } }, { json: { itemId: 1 } }, { json: { itemId: 2 } }],
		];
		const expectedItemsFromTheFinalRunOnly = [[{ json: { itemId: 1 } }, { json: { itemId: 2 } }]];

		it('merges every run when the trigger is v1.2+', () => {
			const output = buildSubWorkflowOutput(buildRun({ mode: 'trigger' }), [trigger(1.2)], false);
			expect(output).toEqual(expectedItemsFromBothRunsConcatenated);
		});

		it('falls back to `lastRunOnly` for pre-1.2 triggers by default', () => {
			const output = buildSubWorkflowOutput(buildRun({ mode: 'trigger' }), [trigger(1.1)], false);
			expect(output).toEqual(expectedItemsFromTheFinalRunOnly);
		});

		it('honours a pre-1.2 trigger that opted in via `returnOutput`', () => {
			const output = buildSubWorkflowOutput(
				buildRun({ mode: 'trigger' }),
				[trigger(1.1, 'allRuns')],
				false,
			);
			expect(output).toEqual(expectedItemsFromBothRunsConcatenated);
		});

		it('caller can force `lastRunOnly` even when the trigger declares `allRuns`', () => {
			const output = buildSubWorkflowOutput(buildRun({ mode: 'trigger' }), [trigger(1.2)], true);
			expect(output).toEqual(expectedItemsFromTheFinalRunOnly);
		});

		describe('pinData substitution', () => {
			it('ignores pinData when the sub-workflow is not running in manual mode', () => {
				const output = buildSubWorkflowOutput(
					buildRun({
						mode: 'trigger',
						pinData: { [LAST_NODE_EXECUTED]: [{ pinned: true }] },
					}),
					[trigger(1.2)],
					false,
				);
				expect(output).toEqual(expectedItemsFromBothRunsConcatenated);
			});

			it('substitutes pinData when manual mode, even on the merged-runs path', () => {
				const output = buildSubWorkflowOutput(
					buildRun({
						mode: 'manual',
						pinData: { [LAST_NODE_EXECUTED]: [{ pinned: true }] },
					}),
					[trigger(1.2)],
					false,
				);

				const expectedPinnedItems = [[{ json: { pinned: true }, pairedItem: { item: 0 } }]];
				expect(output).toEqual(expectedPinnedItems);
			});
		});

		it('returns `[null]` when the sub-workflow recorded no run data', () => {
			expect(
				buildSubWorkflowOutput(
					buildRun({ mode: 'trigger', runData: {}, lastNodeExecuted: undefined }),
					[trigger(1.2)],
					false,
				),
			).toEqual([null]);
		});
	});

	describe('triggerReturnsLastRunOnly', () => {
		function trigger(typeVersion: number, returnOutput?: string): INode {
			return mock<INode>({
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion,
				parameters: returnOutput === undefined ? {} : { returnOutput },
			});
		}

		it('returns true when there is no Execute Workflow Trigger', () => {
			expect(triggerReturnsLastRunOnly([])).toBe(true);
			expect(triggerReturnsLastRunOnly([mock<INode>({ type: 'n8n-nodes-base.set' })])).toBe(true);
		});

		it('defaults pre-1.2 triggers to `lastRunOnly` (backward compat)', () => {
			expect(triggerReturnsLastRunOnly([trigger(1)])).toBe(true);
			expect(triggerReturnsLastRunOnly([trigger(1.1)])).toBe(true);
		});

		it('honours a pre-1.2 trigger that opted in via `returnOutput`', () => {
			expect(triggerReturnsLastRunOnly([trigger(1.1, 'allRuns')])).toBe(false);
			expect(triggerReturnsLastRunOnly([trigger(1.1, 'lastRunOnly')])).toBe(true);
		});

		it('returns false on v1.2+ triggers (option deprecated, allRuns is the default)', () => {
			expect(triggerReturnsLastRunOnly([trigger(1.2)])).toBe(false);
			// Parameters on v1.2+ are ignored: the merged-runs behavior is the default.
			expect(triggerReturnsLastRunOnly([trigger(1.2, 'lastRunOnly')])).toBe(false);
		});
	});
});
