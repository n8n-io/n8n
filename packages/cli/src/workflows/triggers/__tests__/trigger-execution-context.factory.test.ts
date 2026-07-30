/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { Project, WorkflowEntity } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';
import type { ErrorReporter, IGetExecutePollFunctions, StorageConfig } from 'n8n-core';
import { UnexpectedError, Workflow } from 'n8n-workflow';
import type {
	Cron,
	CronExpression,
	ExecutionError,
	IConnections,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import type { ExecutionService } from '@/executions/execution.service';
import type {
	ScheduleTriggerCollectionSession,
	ScheduleTriggerJobRegistrar,
} from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import type { OwnershipService } from '@/services/ownership.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type {
	PublishedWorkflowDataForExecution,
	WorkflowPublishedDataService,
} from '@/workflows/workflow-published-data.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createNodeTypes } from './trigger-test-utils';
import type { PollCursorService } from '../poll-cursor.service';
import {
	TriggerExecutionContextFactory,
	type TriggerFailureHandler,
} from '../trigger-execution-context.factory';

vi.mock('@/execution-lifecycle/execute-error-workflow');

describe('TriggerExecutionContextFactory', () => {
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const workflowExecutionService = mock<WorkflowExecutionService>();
	const eventService = mock<EventService>();
	const executionService = mock<ExecutionService>();
	const activeExecutions = mock<ActiveExecutions>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const storageConfig = mock<StorageConfig>({ modeTag: 'db' }) as unknown as StorageConfig;
	const scheduleTriggerJobRegistrar = mock<ScheduleTriggerJobRegistrar>();
	const scheduleCollectionSession = mock<ScheduleTriggerCollectionSession>();
	const ownershipService = mock<OwnershipService>();
	const nodeTypes = createNodeTypes();

	let factory: TriggerExecutionContextFactory;
	let pollCursorService: MockProxy<PollCursorService>;
	let scopedLogger: MockProxy<Logger>;

	beforeEach(() => {
		vi.clearAllMocks();
		pollCursorService = mock<PollCursorService>({ enabled: false });
		workflowStaticDataService.saveStaticData.mockResolvedValue(undefined);
		workflowExecutionService.runWorkflow.mockResolvedValue('exec-123');
		executionService.createErrorExecution.mockResolvedValue(undefined);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-1', name: 'Test Project' }),
		);

		scheduleTriggerJobRegistrar.interceptsNode.mockReturnValue(false);
		scopedLogger = mock<Logger>();
		const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

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
			scheduleTriggerJobRegistrar,
			ownershipService,
			nodeTypes,
			pollCursorService,
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
					vi.fn(),
					scheduleCollectionSession,
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
					projectId: 'project-1',
					projectName: 'Test Project',
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
					vi.fn(),
					scheduleCollectionSession,
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
					vi.fn(),
					scheduleCollectionSession,
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
					vi.fn(),
					scheduleCollectionSession,
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
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.emit([[]], undefined, donePromise, 'wf-1:node-1:1700000000000');

				await expect(donePromise.promise).resolves.toBeUndefined();
			});
		});

		describe('emitError', () => {
			test('delegates to the injected onTriggerFailure callback', () => {
				const onTriggerFailure =
					vi.fn<(...args: Parameters<TriggerFailureHandler>) => () => void>();
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
					scheduleCollectionSession,
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

		describe('schedule trigger interception', () => {
			test('hands the registrar collector to the trigger context of an intercepted node', () => {
				scheduleTriggerJobRegistrar.interceptsNode.mockReturnValue(true);
				const registerCron = vi.fn();
				scheduleCollectionSession.createCollector.mockReturnValue({ registerCron });

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Schedule Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				expect(scheduleTriggerJobRegistrar.interceptsNode).toHaveBeenCalledWith(node);
				expect(scheduleCollectionSession.createCollector).toHaveBeenCalledWith(workflow, node);

				// The node's registerCron calls must reach the collector, not the
				// in-memory scheduler.
				const cron: Cron = { expression: '0 0 9 * * *' as CronExpression };
				const onTick = vi.fn();
				context.helpers.registerCron(cron, onTick);

				expect(registerCron).toHaveBeenCalledWith(cron, onTick);
			});

			test('keeps the in-memory scheduling functions for a non-intercepted node', () => {
				// interceptsNode returns false by default in this suite.
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
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				expect(scheduleCollectionSession.createCollector).not.toHaveBeenCalled();
				// The context still exposes the default in-memory scheduling helper.
				expect(typeof context.helpers.registerCron).toBe('function');
			});
		});

		describe('saveFailedExecution', () => {
			test('calls createErrorExecution then executeErrorWorkflow', async () => {
				const executeErrorWorkflowSpy = vi
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
					vi.fn(),
					scheduleCollectionSession,
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
				const executeErrorWorkflowSpy = vi
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

	describe('durable poll cursors', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const mode: WorkflowExecuteMode = 'trigger';
		const activation: WorkflowActivateMode = 'activate';
		const pollData: INodeExecutionData[][] = [[{ json: { id: 1 } }]];

		const buildWorkflow = () => {
			const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
			workflow.getStaticData.mockReturnValue({});
			return workflow;
		};

		const buildContext = (workflow: Workflow, node: INode) => {
			const getPollFunctions = factory.getExecutePollFunctions(
				mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				additionalData,
				mode,
				activation,
				async () => mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
			);
			return getPollFunctions(workflow, node, additionalData, mode, activation);
		};

		beforeEach(() => {
			pollCursorService.readCursor.mockResolvedValue(null);
			pollCursorService.commitCursorOnly.mockResolvedValue(undefined);
			pollCursorService.mirrorToStaticData.mockResolvedValue(undefined);
			workflowExecutionService.runPolledWorkflow.mockResolvedValue('exec-polled');
		});

		test('routes a staged cursor to runWorkflow and still saves static data when the flag is off', async () => {
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});

		test('routes a staged cursor to runPolledWorkflow and skips saveStaticData when the flag is on', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				node,
				pollData,
				additionalData,
				mode,
				{ lastItemId: 'a' },
				workflow,
				undefined,
			);
			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
			expect(workflowStaticDataService.saveStaticData).not.toHaveBeenCalled();
		});

		test('falls through to runWorkflow and reports it when the flag is on but nothing was staged', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
			expect(scopedLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('emitted items without staging a cursor'),
				{ workflowId: 'wf-1', nodeId: 'node-1' },
			);
		});

		test('does not carry a cursor staged by one poll into the next poll', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				context.__emit(pollData);
			});
			await sleep(0);

			await context.__runPoll(async () => {
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
		});

		test('does not commit on a later poll a cursor staged by a poll that threw', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await expect(
				context.__runPoll(async () => {
					context.setCursor({ lastItemId: 'a' });
					throw new Error('poll source unreachable');
				}),
			).rejects.toThrow('poll source unreachable');

			await context.__runPoll(async () => {
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('does not emit on a later poll a cursor staged by a poll that threw', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await expect(
				context.__runPoll(async () => {
					context.setCursor({ lastItemId: 'a' });
					throw new Error('poll source unreachable');
				}),
			).rejects.toThrow('poll source unreachable');

			await context.__runPoll(async () => {
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
		});

		test('does not commit on a later poll a cursor staged by an activation poll that skipped the commit', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
			});

			await context.__runPoll(async () => {
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('gives each of two overlapping polls of one node the cursor it staged itself', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			const slowPoll = context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'slow' });
				await sleep(10);
				context.__emit(pollData);
			});

			const fastPoll = context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'fast' });
				context.__emit(pollData);
			});

			await Promise.all([slowPoll, fastPoll]);
			await sleep(0);

			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledTimes(2);
			const stagedCursors = workflowExecutionService.runPolledWorkflow.mock.calls.map(
				(call) => call[5],
			);
			expect(stagedCursors).toEqual([{ lastItemId: 'fast' }, { lastItemId: 'slow' }]);
		});

		test('commits for each of two overlapping polls only the cursor it staged itself', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			const slowPoll = context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'slow' });
				await sleep(10);
				await context.__commitCursor();
			});

			const fastPoll = context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'fast' });
				await context.__commitCursor();
			});

			await Promise.all([slowPoll, fastPoll]);

			expect(pollCursorService.commitCursorOnly).toHaveBeenNthCalledWith(1, 'wf-1', 'node-1', {
				lastItemId: 'fast',
			});
			expect(pollCursorService.commitCursorOnly).toHaveBeenNthCalledWith(2, 'wf-1', 'node-1', {
				lastItemId: 'slow',
			});
		});

		test('discards and reports a cursor staged outside a poll', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			context.setCursor({ lastItemId: 'a' });

			await context.__runPoll(async () => {
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
			expect(scopedLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('staged a cursor outside of a poll'),
				{ workflowId: 'wf-1', nodeId: 'node-1' },
			);
		});

		test('keeps the staged cursors of two poll nodes built from one factory apart', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const firstNode = mock<INode>({ id: 'node-1', name: 'First Poll Node' });
			const secondNode = mock<INode>({ id: 'node-2', name: 'Second Poll Node' });

			const getPollFunctions = factory.getExecutePollFunctions(
				mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				additionalData,
				mode,
				activation,
				async () => mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
			);
			const firstContext = getPollFunctions(workflow, firstNode, additionalData, mode, activation);
			const secondContext = getPollFunctions(
				workflow,
				secondNode,
				additionalData,
				mode,
				activation,
			);

			await firstContext.__runPoll(async () => {
				firstContext.setCursor({ lastItemId: 'first-only' });

				await secondContext.__runPoll(async () => {
					secondContext.__emit(pollData);
				});
				await sleep(0);

				expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);

				firstContext.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledWith(
				expect.anything(),
				firstNode,
				pollData,
				additionalData,
				mode,
				{ lastItemId: 'first-only' },
				workflow,
				undefined,
			);
		});

		test("reads the cursor through the service, seeded with the node's static data", async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			workflow.getStaticData.mockReturnValue({ lastItemId: 'from-static-data' });
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			pollCursorService.readCursor.mockResolvedValue({ lastItemId: 'from-db' });
			const context = buildContext(workflow, node);

			await expect(context.getCursor()).resolves.toEqual({ lastItemId: 'from-db' });
			expect(pollCursorService.readCursor).toHaveBeenCalledWith('wf-1', 'node-1', {
				lastItemId: 'from-static-data',
			});
		});

		test('resolves getCursor to null when the service has no cursor for the node', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await expect(context.getCursor()).resolves.toBeNull();
		});

		test('replaces the cursor an earlier stage in the same poll staged', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a', etag: 'v1' });
				context.setCursor({ lastItemId: 'b' });
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledWith(
				expect.anything(),
				node,
				pollData,
				additionalData,
				mode,
				{ lastItemId: 'b' },
				workflow,
				undefined,
			);
		});

		test('commits a staged cursor on its own when the poll produced no items', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledWith('wf-1', 'node-1', {
				lastItemId: 'a',
			});
			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
			expect(workflowStaticDataService.saveStaticData).not.toHaveBeenCalled();
		});

		test('commits nothing when the poll staged no cursor', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('commits nothing when the poll staged a cursor with no keys', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({});
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('commits nothing when a cursor with no keys replaces an earlier staged one', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				context.setCursor({});
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('commits nothing on a second commit within one poll', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				await context.__commitCursor();
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledTimes(1);
		});

		test('commits nothing after an emit already carried the staged cursor', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				context.__emit(pollData);
				await sleep(0);
				await context.__commitCursor();
			});

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledTimes(1);
			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('routes a later emit to runWorkflow when the staged cursor was already committed', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				await context.__commitCursor();

				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});

		test('leaves cursor reads and commits to the static data when the flag is off', async () => {
			const workflow = buildWorkflow();
			workflow.getStaticData.mockReturnValue({ lastItemId: 'from-static-data' });
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				await expect(context.getCursor()).resolves.toEqual({ lastItemId: 'from-static-data' });
				await context.__commitCursor();
			});

			expect(pollCursorService.readCursor).not.toHaveBeenCalled();
			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
		});

		test('propagates a failing cursor commit to the engine that called it', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const commitError = new Error('poller state write failed');
			pollCursorService.commitCursorOnly.mockRejectedValue(commitError);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await expect(
				context.__runPoll(async () => {
					context.setCursor({ lastItemId: 'a' });
					await context.__commitCursor();
				}),
			).rejects.toThrow(commitError);
		});

		test('logs a failing polled run rather than leaving the rejection unhandled', async () => {
			vi.spyOn(pollCursorService, 'enabled', 'get').mockReturnValue(true);
			const runError = new Error('commit failed');
			workflowExecutionService.runPolledWorkflow.mockRejectedValue(runError);
			const workflow = buildWorkflow();
			const node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			const context = buildContext(workflow, node);

			await context.__runPoll(async () => {
				context.setCursor({ lastItemId: 'a' });
				context.__emit(pollData);
			});
			await sleep(0);

			expect(scopedLogger.error).toHaveBeenCalledWith('commit failed', { error: runError });
		});
	});

	describe('createPollExecutionContext', () => {
		const pollNode: INode = {
			id: 'node-1',
			name: 'Poll Trigger',
			type: 'poll',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const buildWorkflowData = (): IWorkflowBase =>
			({
				id: 'wf-1',
				name: 'My Polling Workflow',
				active: true,
				nodes: [pollNode],
				connections: {},
				settings: { timezone: 'Europe/Berlin' },
				staticData: {},
			}) as IWorkflowBase;

		test('builds the workflow and poll context with the activation path modes', async () => {
			const workflowData = buildWorkflowData();
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const pollFunctions = mock<IPollFunctions>();
			const getPollFunctions = vi.fn().mockReturnValue(pollFunctions);
			const getExecutePollFunctionsSpy = vi
				.spyOn(factory, 'getExecutePollFunctions')
				.mockReturnValue(getPollFunctions as unknown as IGetExecutePollFunctions);

			const result = await factory.createPollExecutionContext(workflowData, pollNode);

			expect(result.workflow).toBeInstanceOf(Workflow);
			expect(result.pollFunctions).toBe(pollFunctions);

			expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				workflowSettings: { timezone: 'Europe/Berlin' },
			});

			// Built with the activation path's execution/activation modes ('trigger'/'update').
			// Exactly five args: no per-occurrence deduplication key is threaded as a sixth.
			expect(getExecutePollFunctionsSpy).toHaveBeenCalledWith(
				workflowData,
				additionalData,
				'trigger',
				'update',
				expect.any(Function),
			);

			expect(getPollFunctions).toHaveBeenCalledWith(
				result.workflow,
				pollNode,
				additionalData,
				'trigger',
				'update',
			);
		});

		test('binds a fresh (non-cached) resolver so the poll cursor is never stale', async () => {
			const workflowData = buildWorkflowData();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const getExecutePollFunctionsSpy = vi
				.spyOn(factory, 'getExecutePollFunctions')
				.mockReturnValue(vi.fn() as unknown as IGetExecutePollFunctions);

			workflowPublishedDataService.getPublishedWorkflowDataForExecution.mockResolvedValue(
				mock<PublishedWorkflowDataForExecution>(),
			);

			await factory.createPollExecutionContext(workflowData, pollNode);

			// The __emit -> runWorkflow closure must resolve fresh data, never the cache.
			const resolveWorkflowData = getExecutePollFunctionsSpy.mock.calls[0][4];
			await resolveWorkflowData();

			expect(
				workflowPublishedDataService.getPublishedWorkflowDataForExecution,
			).toHaveBeenCalledWith('wf-1');
			expect(
				workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution,
			).not.toHaveBeenCalled();
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

	const buildPublishedWorkflowData = (
		overrides: Partial<PublishedWorkflowDataForExecution> = {},
	): PublishedWorkflowDataForExecution => ({
		id: 'wf-1',
		name: 'My workflow',
		description: null,
		active: true,
		isArchived: false,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		settings: { timezone: 'Europe/Berlin' },
		staticData: { foo: 'bar' },
		activeVersionId: 'published-version',
		versionCounter: 3,
		versionId: 'published-version',
		nodes: [{ id: 'n1' } as INode],
		connections: {} as IConnections,
		nodeGroups: [],
		...overrides,
	});

	describe('loadPublishedWorkflowData', () => {
		test('sources nodes/connections/versionId from the published version and other fields from the workflow projection', async () => {
			const publishedNodes: INode[] = [{ id: 'n1' } as INode];
			const publishedConnections: IConnections = {};
			const publishedNodeGroups = [{ id: 'g1', name: 'Group', nodeIds: ['n1'] }];
			const workflowData = buildPublishedWorkflowData({
				nodes: publishedNodes,
				connections: publishedConnections,
				nodeGroups: publishedNodeGroups,
			});

			workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution.mockResolvedValue(
				workflowData,
			);

			const result = await factory.loadPublishedWorkflowData('wf-1');

			// Topology + version that actually ran come from the published snapshot.
			expect(result.nodes).toBe(publishedNodes);
			expect(result.connections).toBe(publishedConnections);
			expect(result.nodeGroups).toBe(publishedNodeGroups);
			expect(result.versionId).toBe('published-version');

			// Other execution-relevant fields come from the live workflow entity.
			expect(result.id).toBe('wf-1');
			expect(result.name).toBe('My workflow');
			expect(result.active).toBe(true);
			expect(result.settings).toEqual({ timezone: 'Europe/Berlin' });
			expect(result.staticData).toEqual({ foo: 'bar' });
			expect(result.activeVersionId).toBe('published-version');
			expect(result.versionCounter).toBe(3);

			// Deliberately excluded from a production trigger execution.
			expect(result.pinData).toBeUndefined();
			expect(result.meta).toBeUndefined();
		});

		test('bypasses the cache and reads fresh from the database when bypassCache is true', async () => {
			const workflowData = buildPublishedWorkflowData();
			workflowPublishedDataService.getPublishedWorkflowDataForExecution.mockResolvedValue(
				workflowData,
			);

			const result = await factory.loadPublishedWorkflowData('wf-1', { bypassCache: true });

			expect(result.staticData).toEqual({ foo: 'bar' });
			// The poll path must never read through the publish-time cache.
			expect(
				workflowPublishedDataService.getPublishedWorkflowDataForExecution,
			).toHaveBeenCalledWith('wf-1');
			expect(
				workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution,
			).not.toHaveBeenCalled();
		});

		it.each([
			{
				description: 'default (cached) path',
				options: undefined,
				calledMethod: 'getCachedPublishedWorkflowDataForExecution' as const,
				skippedMethod: 'getPublishedWorkflowDataForExecution' as const,
			},
			{
				description: 'bypassCache path',
				options: { bypassCache: true },
				calledMethod: 'getPublishedWorkflowDataForExecution' as const,
				skippedMethod: 'getCachedPublishedWorkflowDataForExecution' as const,
			},
		])(
			'throws UnexpectedError when the service returns null ($description)',
			async ({ options, calledMethod, skippedMethod }) => {
				workflowPublishedDataService[calledMethod].mockResolvedValue(null);

				await expect(factory.loadPublishedWorkflowData('wf-1', options)).rejects.toThrow(
					UnexpectedError,
				);
				// Confirms the null came back from the branch bypassCache actually
				// selects, not merely that some unmocked call returned undefined.
				expect(workflowPublishedDataService[calledMethod]).toHaveBeenCalledWith('wf-1');
				expect(workflowPublishedDataService[skippedMethod]).not.toHaveBeenCalled();
			},
		);
	});
});
