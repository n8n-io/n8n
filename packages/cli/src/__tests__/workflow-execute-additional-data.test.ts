import { mock } from 'jest-mock-extended';
import type { IWorkflowBase } from 'n8n-workflow';
import type {
	IExecuteWorkflowInfo,
	IWorkflowExecuteAdditionalData,
	ExecuteWorkflowOptions,
	IRun,
	INodeExecutionData,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';
import Container from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { VariablesService } from '@/environments/variables/variables.service.ee';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { SecretsHelper } from '@/secrets-helpers';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { SubworkflowPolicyChecker } from '@/subworkflows/subworkflow-policy-checker.service';
import { Telemetry } from '@/telemetry';
import { PermissionChecker } from '@/user-management/permission-checker';
import { executeWorkflow, getBase, getRunData } from '@/workflow-execute-additional-data';
import { mockInstance } from '@test/mocking';

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
	const secretsHelper = mockInstance(SecretsHelper);
	const eventService = mockInstance(EventService);
	mockInstance(ExternalHooks);
	Container.set(VariablesService, variablesService);
	Container.set(CredentialsHelper, credentialsHelper);
	Container.set(SecretsHelper, secretsHelper);
	const executionRepository = mockInstance(ExecutionRepository);
	mockInstance(Telemetry);
	const workflowRepository = mockInstance(WorkflowRepository);
	const activeExecutions = mockInstance(ActiveExecutions);
	mockInstance(PermissionChecker);
	mockInstance(SubworkflowPolicyChecker);
	mockInstance(WorkflowStatisticsService);

	test('logAiEvent should call MessageEventBus', async () => {
		const additionalData = await getBase('user-id');

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
				mock<WorkflowEntity>({ id: EXECUTION_ID, nodes: [] }),
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
		it('should throw error to add trigger ndoe', async () => {
			const workflow = mock<IWorkflowBase>({
				id: '1',
				name: 'test',
				nodes: [],
				active: false,
			});
			await expect(getRunData(workflow)).rejects.toThrowError('Missing node to start execution');
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

		it('should return default data', async () => {
			expect(await getRunData(workflow)).toEqual({
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
			expect(await getRunData(workflow, data, parentExecution)).toEqual({
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
});
