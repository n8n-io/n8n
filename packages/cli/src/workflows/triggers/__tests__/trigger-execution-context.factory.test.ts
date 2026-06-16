/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, StorageConfig } from 'n8n-core';
import type {
	ExecutionError,
	IConnections,
	INode,
	INodeExecutionData,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { createDeferredPromise, sleep, UnexpectedError } from 'n8n-workflow';
import type { Workflow } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import type { ExecutionService } from '@/executions/execution.service';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import {
	TriggerExecutionContextFactory,
	type TriggerFailureHandler,
} from '../trigger-execution-context.factory';

jest.mock('@/execution-lifecycle/execute-error-workflow');

describe('TriggerExecutionContextFactory', () => {
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const workflowExecutionService = mock<WorkflowExecutionService>();
	const eventService = mock<EventService>();
	const executionService = mock<ExecutionService>();
	const activeExecutions = mock<ActiveExecutions>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const storageConfig = mock<StorageConfig>({ modeTag: 'db' }) as unknown as StorageConfig;

	let factory: TriggerExecutionContextFactory;

	beforeEach(() => {
		jest.clearAllMocks();
		workflowStaticDataService.saveStaticData.mockResolvedValue(undefined);
		workflowExecutionService.runWorkflow.mockResolvedValue('exec-123');
		executionService.createErrorExecution.mockResolvedValue(undefined);

		const scopedLogger = mock<Logger>();
		const rootLogger = mock<Logger>({ scoped: jest.fn().mockReturnValue(scopedLogger) });

		factory = new TriggerExecutionContextFactory(
			rootLogger,
			mock<ErrorReporter>(),
			activeExecutions,
			eventService,
			executionService,
			workflowStaticDataService,
			workflowExecutionService,
			storageConfig,
			workflowPublishedDataService,
		);
	});

	describe('getExecuteTriggerFunctions', () => {
		describe('emit', () => {
			test('saves static data, runs workflow, and emits workflow-executed', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const triggerData: INodeExecutionData[][] = [[]];

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					jest.fn(),
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit(triggerData);
				await sleep(0);

				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					triggerData,
					additionalData,
					mode,
					undefined,
					undefined,
				);
				expect(eventService.emit).toHaveBeenCalledWith('workflow-executed', {
					workflowId: workflowData.id,
					workflowName: workflowData.name,
					executionId: 'exec-123',
					source: 'trigger',
				});
			});

			test('forwards deduplicationKey to runWorkflow', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					jest.fn(),
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit([[]], undefined, undefined, 'wf-1:node-1:1700000000000');
				await sleep(0);

				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					[[]],
					additionalData,
					mode,
					undefined,
					'wf-1:node-1:1700000000000',
				);
			});

			test('resolves donePromise via getPostExecutePromise', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const runResult = mock<IRun>();
				activeExecutions.getPostExecutePromise.mockResolvedValue(runResult);

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					jest.fn(),
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.emit([[]], undefined, donePromise);
				await sleep(0);

				expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith('exec-123');
				await expect(donePromise.promise).resolves.toBe(runResult);
			});

			test('does not emit workflow-executed on DuplicateExecutionError', async () => {
				workflowExecutionService.runWorkflow.mockRejectedValueOnce(
					new DuplicateExecutionError('wf-1:node-1:1700000000000'),
				);

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					jest.fn(),
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit([[]], undefined, undefined, 'wf-1:node-1:1700000000000');
				await sleep(0);

				expect(eventService.emit).not.toHaveBeenCalled();
			});

			test('resolves donePromise with undefined on DuplicateExecutionError', async () => {
				workflowExecutionService.runWorkflow.mockRejectedValueOnce(
					new DuplicateExecutionError('wf-1:node-1:1700000000000'),
				);

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					jest.fn(),
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.emit([[]], undefined, donePromise, 'wf-1:node-1:1700000000000');

				await expect(donePromise.promise).resolves.toBeUndefined();
			});
		});

		describe('emitError', () => {
			test('delegates to the injected onTriggerFailure callback', () => {
				const onTriggerFailure = jest.fn<() => void, Parameters<TriggerFailureHandler>>();
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					onTriggerFailure,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				const error = new Error('Trigger connection failed');
				context.emitError(error);

				expect(onTriggerFailure).toHaveBeenCalledWith({
					error,
					node,
					workflowData,
					mode,
					activation,
				});
			});
		});

		describe('saveFailedExecution', () => {
			test('calls createErrorExecution then executeErrorWorkflow', async () => {
				const executeErrorWorkflowSpy = jest
					.spyOn(factory, 'executeErrorWorkflow')
					.mockImplementation(() => {});

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					jest.fn(),
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const executionError = mock<ExecutionError>();

				context.saveFailedExecution(executionError);
				await sleep(0);

				expect(executionService.createErrorExecution).toHaveBeenCalledWith(
					executionError,
					node,
					workflowData,
					workflow,
					mode,
				);
				expect(executeErrorWorkflowSpy).toHaveBeenCalledWith(executionError, workflowData, mode);
			});
		});
	});

	describe('getExecutePollFunctions', () => {
		describe('__emit', () => {
			test('saves static data and runs workflow', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });
				const pollData: INodeExecutionData[][] = [[{ json: {} }]];

				const getPollFunctions = factory.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getPollFunctions(workflow, node, additionalData, mode, activation);

				context.__emit(pollData);
				await sleep(0);

				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					pollData,
					additionalData,
					mode,
					undefined,
				);
			});

			test('resolves donePromise via getPostExecutePromise', async () => {
				const runResult = mock<IRun>();
				activeExecutions.getPostExecutePromise.mockResolvedValue(runResult);

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });

				const getPollFunctions = factory.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getPollFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.__emit([[]], undefined, donePromise);
				await sleep(0);

				expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith('exec-123');
				await expect(donePromise.promise).resolves.toBe(runResult);
			});
		});

		describe('__emitError', () => {
			test('calls createErrorExecution then executeErrorWorkflow', async () => {
				const executeErrorWorkflowSpy = jest
					.spyOn(factory, 'executeErrorWorkflow')
					.mockImplementation(() => {});

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });

				const getPollFunctions = factory.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getPollFunctions(workflow, node, additionalData, mode, activation);
				const executionError = mock<ExecutionError>();

				context.__emitError(executionError);
				await sleep(0);

				expect(executionService.createErrorExecution).toHaveBeenCalledWith(
					executionError,
					node,
					workflowData,
					workflow,
					mode,
				);
				expect(executeErrorWorkflowSpy).toHaveBeenCalledWith(executionError, workflowData, mode);
			});
		});
	});

	describe('executeErrorWorkflow', () => {
		test('calls the standalone function with a correctly shaped IRun', () => {
			const workflowData = mock<IWorkflowBase>();
			const error = mock<ExecutionError>();
			const mode: WorkflowExecuteMode = 'trigger';

			factory.executeErrorWorkflow(error, workflowData, mode);

			expect(executeErrorWorkflow).toHaveBeenCalledWith(
				workflowData,
				expect.objectContaining({
					mode,
					finished: false,
					status: 'running',
					storedAt: 'db',
				}),
				mode,
			);
		});
	});

	describe('loadPublishedWorkflowData', () => {
		test('returns IWorkflowBase with nodes and connections from the published version', async () => {
			const publishedNodes: INode[] = [{ id: 'n1' } as INode];
			const publishedConnections: IConnections = {};
			const initialWorkflowData = mock<WorkflowEntity>({ id: 'wf-1' });

			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue({
				workflow: mock<WorkflowEntity>(),
				publishedVersion: {
					nodes: publishedNodes,
					connections: publishedConnections,
				} as WorkflowHistory,
			});

			const result = await factory.loadPublishedWorkflowData(initialWorkflowData);

			expect(result.nodes).toBe(publishedNodes);
			expect(result.connections).toBe(publishedConnections);
		});

		test('throws UnexpectedError when the service returns null', async () => {
			const initialWorkflowData = mock<WorkflowEntity>({ id: 'wf-1' });
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue(null);

			await expect(factory.loadPublishedWorkflowData(initialWorkflowData)).rejects.toThrow(
				UnexpectedError,
			);
		});
	});
});
