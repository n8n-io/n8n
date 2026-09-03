/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Project, WorkflowEntity } from '@n8n/db';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';
import type {
	BinaryDataService,
	ErrorReporter,
	IGetExecutePollFunctions,
	StorageConfig,
} from 'n8n-core';
import { UnexpectedError, UserError, Workflow } from 'n8n-workflow';
import type {
	Cron,
	CronExpression,
	ExecutionError,
	IBinaryData,
	IConnections,
	IExecuteResponsePromiseData,
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
import type { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { EngineV2PayloadGuard } from '@/services/engine-v2-payload-guard.service';
import { EngineV2ActiveTriggers } from '@/workflows/triggers/engine-v2-active-triggers';
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
	// The real service over a mocked dispatcher: `engineV2Dispatcher.handlesWorkflow`
	// is the only input, and the refusals under test stay the production ones.
	const engineV2Dispatcher = mock<EngineV2Dispatcher>();
	const binaryDataService = mock<BinaryDataService>();
	const engineV2ActiveTriggers = new EngineV2ActiveTriggers(
		engineV2Dispatcher,
		new EngineV2PayloadGuard(binaryDataService, mock<Logger>()),
	);

	let factory: TriggerExecutionContextFactory;
	let errorReporter: ErrorReporter;
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
		engineV2Dispatcher.handlesWorkflow.mockReturnValue(false);
		scopedLogger = mock<Logger>();
		const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });
		errorReporter = mock<ErrorReporter>();

		factory = new TriggerExecutionContextFactory(
			rootLogger,
			errorReporter,
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
			mock<GlobalConfig>({ scheduler: { pollTimeoutSeconds: 45, leaseDurationSeconds: 60 } }),
			engineV2ActiveTriggers,
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

			describe('when the execution fails', () => {
				// A trigger fires on a timer, so nothing is awaiting `emit`. Any promise
				// it derives without a terminal handler surfaces as an unhandled
				// rejection, which fails the whole vitest run even though every
				// assertion passed. See DEVP-687.
				const unhandled: unknown[] = [];
				const captureUnhandled = (reason: unknown) => unhandled.push(reason);

				beforeEach(() => {
					unhandled.length = 0;
					process.on('unhandledRejection', captureUnhandled);
				});

				afterEach(() => {
					process.off('unhandledRejection', captureUnhandled);
				});

				/** Let Node reach the checkpoint where it reports unhandled rejections. */
				const flush = async () => {
					await sleep(0);
					await new Promise((resolve) => setImmediate(resolve));
				};

				const emitWith = (donePromise?: IDeferredPromise<IRun>) => {
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

					context.emit([[]], undefined, donePromise);
				};

				test('logs the error and does not emit workflow-executed', async () => {
					workflowExecutionService.runWorkflow.mockRejectedValueOnce(new UnexpectedError('boom'));

					emitWith();
					await flush();

					expect(unhandled).toEqual([]);
					expect(scopedLogger.error).toHaveBeenCalledWith('boom', expect.objectContaining({}));
					expect(eventService.emit).not.toHaveBeenCalled();
				});

				test('rejects donePromise instead of leaving it pending', async () => {
					workflowExecutionService.runWorkflow.mockRejectedValueOnce(new UnexpectedError('boom'));
					const donePromise = createDeferredPromise<IRun>();

					emitWith(donePromise);

					await expect(donePromise.promise).rejects.toThrow('boom');
					await flush();
					expect(unhandled).toEqual([]);
				});

				test('rejects donePromise when the workflow data cannot be resolved', async () => {
					const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
					const donePromise = createDeferredPromise<IRun>();

					const getTriggerFunctions = factory.getExecuteTriggerFunctions(
						workflowData,
						mock<IWorkflowExecuteAdditionalData>(),
						'trigger',
						'activate',
						async () => {
							throw new UnexpectedError('Published version not found for workflow');
						},
						vi.fn(),
						scheduleCollectionSession,
					);
					const context = getTriggerFunctions(
						mock<Workflow>({ name: 'Test Workflow' }),
						mock<INode>({ name: 'Trigger Node' }),
						mock<IWorkflowExecuteAdditionalData>(),
						'trigger',
						'activate',
					);

					context.emit([[]], undefined, donePromise);

					await expect(donePromise.promise).rejects.toThrow('Published version not found');
					await flush();
					expect(unhandled).toEqual([]);
					expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
				});

				test('rejects donePromise with an Error when the failure is not one', async () => {
					workflowExecutionService.runWorkflow.mockRejectedValueOnce('just a string');
					const donePromise = createDeferredPromise<IRun>();

					emitWith(donePromise);

					await expect(donePromise.promise).rejects.toBeInstanceOf(Error);
					await flush();
					expect(unhandled).toEqual([]);
				});

				test('rejects donePromise when the post-execute promise fails', async () => {
					activeExecutions.getPostExecutePromise.mockRejectedValueOnce(
						new UnexpectedError('execution gone'),
					);
					const donePromise = createDeferredPromise<IRun>();

					emitWith(donePromise);

					await expect(donePromise.promise).rejects.toThrow('execution gone');
					await flush();
					expect(unhandled).toEqual([]);
				});

				test('does not report an unhandled rejection on the happy path', async () => {
					activeExecutions.getPostExecutePromise.mockResolvedValue(mock<IRun>());
					const donePromise = createDeferredPromise<IRun>();

					emitWith(donePromise);
					await flush();

					expect(unhandled).toEqual([]);
					expect(eventService.emit).toHaveBeenCalledTimes(1);
				});

				test('logs when the failed execution cannot be recorded', async () => {
					vi.spyOn(factory, 'executeErrorWorkflow').mockImplementation(() => {});
					executionService.createErrorExecution.mockRejectedValueOnce(
						new UnexpectedError('db down'),
					);

					const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
					const getTriggerFunctions = factory.getExecuteTriggerFunctions(
						workflowData,
						mock<IWorkflowExecuteAdditionalData>(),
						'trigger',
						'activate',
						async () => workflowData,
						vi.fn(),
						scheduleCollectionSession,
					);
					const context = getTriggerFunctions(
						mock<Workflow>({ name: 'Test Workflow' }),
						mock<INode>({ name: 'Trigger Node' }),
						mock<IWorkflowExecuteAdditionalData>(),
						'trigger',
						'activate',
					);

					context.saveFailedExecution(mock<ExecutionError>());
					await flush();

					expect(unhandled).toEqual([]);
					expect(errorReporter.error).toHaveBeenCalled();
				});
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
			test('runs the workflow', async () => {
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

			describe('when the execution fails', () => {
				// See the equivalent block for `emit` — a poll fires on a timer too.
				const unhandled: unknown[] = [];
				const captureUnhandled = (reason: unknown) => unhandled.push(reason);

				beforeEach(() => {
					unhandled.length = 0;
					process.on('unhandledRejection', captureUnhandled);
				});

				afterEach(() => {
					process.off('unhandledRejection', captureUnhandled);
				});

				const flush = async () => {
					await sleep(0);
					await new Promise((resolve) => setImmediate(resolve));
				};

				const pollEmitWith = (donePromise?: IDeferredPromise<IRun>) => {
					const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
					const additionalData = mock<IWorkflowExecuteAdditionalData>();

					const getPollFunctions = factory.getExecutePollFunctions(
						workflowData,
						additionalData,
						'trigger',
						'activate',
						async () => workflowData,
					);
					const context = getPollFunctions(
						mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' }),
						mock<INode>({ name: 'Poll Node' }),
						additionalData,
						'trigger',
						'activate',
					);

					context.__emit([[]], undefined, donePromise);
				};

				test('logs the error without a donePromise', async () => {
					workflowExecutionService.runWorkflow.mockRejectedValueOnce(new UnexpectedError('boom'));

					pollEmitWith();
					await flush();

					expect(unhandled).toEqual([]);
					expect(scopedLogger.error).toHaveBeenCalledWith('boom', expect.objectContaining({}));
				});

				test('rejects donePromise instead of leaving it pending', async () => {
					workflowExecutionService.runWorkflow.mockRejectedValueOnce(new UnexpectedError('boom'));
					const donePromise = createDeferredPromise<IRun>();

					pollEmitWith(donePromise);

					await expect(donePromise.promise).rejects.toThrow('boom');
					await flush();
					expect(unhandled).toEqual([]);
				});

				test('logs when the failed execution cannot be recorded', async () => {
					vi.spyOn(factory, 'executeErrorWorkflow').mockImplementation(() => {});
					executionService.createErrorExecution.mockRejectedValueOnce(
						new UnexpectedError('db down'),
					);

					const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
					const getPollFunctions = factory.getExecutePollFunctions(
						workflowData,
						mock<IWorkflowExecuteAdditionalData>(),
						'trigger',
						'activate',
						async () => workflowData,
					);
					const context = getPollFunctions(
						mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' }),
						mock<INode>({ name: 'Poll Node' }),
						mock<IWorkflowExecuteAdditionalData>(),
						'trigger',
						'activate',
					);

					context.__emitError(mock<ExecutionError>());
					await flush();

					expect(unhandled).toEqual([]);
					expect(errorReporter.error).toHaveBeenCalled();
				});
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

		type RunnablePollFunctions = IPollFunctions &
			Required<Pick<IPollFunctions, '__runPoll' | '__commitCursor'>>;

		const buildWorkflow = () => {
			const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
			workflow.getStaticData.mockReturnValue({});
			return workflow;
		};

		const buildContext = (
			workflow: Workflow,
			node: INode,
			prefetchedCursor?: Record<string, unknown>,
		): RunnablePollFunctions => {
			const getPollFunctions = factory.getExecutePollFunctions(
				mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				additionalData,
				mode,
				activation,
				async () => mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				undefined,
				prefetchedCursor,
			);
			return getPollFunctions(
				workflow,
				node,
				additionalData,
				mode,
				activation,
			) as RunnablePollFunctions;
		};

		let workflow: MockProxy<Workflow>;
		let node: INode;
		let context: RunnablePollFunctions;

		beforeEach(() => {
			pollCursorService.resolveCursor.mockResolvedValue({ migrated: true, cursor: {} });
			pollCursorService.commitCursorOnly.mockResolvedValue(true);
			workflowExecutionService.runPolledWorkflow.mockResolvedValue('exec-polled');

			workflow = buildWorkflow();
			node = mock<INode>({ id: 'node-1', name: 'Poll Node' });
			context = buildContext(workflow, node);
		});

		test('seeds the node static data from the stored cursor for the duration of one poll', async () => {
			workflow.getStaticData.mockReturnValue({ lastItemId: 'from-static-data' });
			pollCursorService.resolveCursor.mockResolvedValue({
				migrated: true,
				cursor: { lastItemId: 'from-db' },
			});

			await context.__runPoll(async () => {
				expect(context.getWorkflowStaticData('node')).toEqual({ lastItemId: 'from-db' });
			});

			expect(pollCursorService.resolveCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'from-static-data' },
				undefined,
			);
		});

		test('falls back to the real static data when the node has never migrated and the flag is off', async () => {
			pollCursorService.resolveCursor.mockResolvedValue({ migrated: false });
			workflow.getStaticData.mockReturnValue({ lastItemId: 'legacy' });

			await context.__runPoll(async () => {
				const nodeStaticData = context.getWorkflowStaticData('node');
				expect(nodeStaticData).toEqual({ lastItemId: 'legacy' });
				nodeStaticData.lastItemId = 'mutated';
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflow.getStaticData).toHaveBeenCalledWith('node', node);
			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
			expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
			// An unmigrated node's mutation lands in the real static-data bucket, so
			// this save is the only thing that persists it.
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});

		test('migrates on the next poll once resolveCursor reports a row, seeded from what an earlier unmigrated poll mutated', async () => {
			pollCursorService.resolveCursor.mockResolvedValueOnce({ migrated: false });
			workflow.getStaticData.mockReturnValue({ lastItemId: 'legacy' });

			await context.__runPoll(async () => {
				context.getWorkflowStaticData('node').lastItemId = 'mutated-before-migration';
			});

			pollCursorService.resolveCursor.mockResolvedValueOnce({
				migrated: true,
				cursor: { lastItemId: 'mutated-before-migration' },
			});

			await context.__runPoll(async () => {
				expect(context.getWorkflowStaticData('node')).toEqual({
					lastItemId: 'mutated-before-migration',
				});
			});

			expect(pollCursorService.resolveCursor).toHaveBeenLastCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'mutated-before-migration' },
				undefined,
			);
		});

		test('threads a prefetched cursor into resolveCursor so it can skip its own read', async () => {
			workflow.getStaticData.mockReturnValue({ lastItemId: 'from-static-data' });
			const prefetched = { lastItemId: 'prefetched' };
			const prefetchedContext = buildContext(workflow, node, prefetched);

			await prefetchedContext.__runPoll(async () => {});

			expect(pollCursorService.resolveCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'from-static-data' },
				prefetched,
			);
		});

		test('routes to runWorkflow, not runPolledWorkflow, when the node leaves its static data unchanged', async () => {
			await context.__runPoll(async () => {
				context.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
		});

		test('routes to runPolledWorkflow with the mutated state when the node changes its static data', async () => {
			const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();

			await context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
				context.__emit(pollData, responsePromise);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				node,
				pollData,
				additionalData,
				mode,
				{ lastItemId: 'a' },
				responsePromise,
				undefined,
			);
			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
		});

		// A poll that neither emitted nor committed leaves its mutation behind; the next
		// poll must not pick it up and commit an advance past items nobody carried.
		const abandonedStaging = [
			{
				title: 'a poll that threw',
				stage: async () => {
					await expect(
						context.__runPoll(async () => {
							Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
							throw new Error('poll source unreachable');
						}),
					).rejects.toThrow('poll source unreachable');
				},
			},
			{
				title: 'an activation poll that skipped the commit',
				stage: async () => {
					await context.__runPoll(async () => {
						Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
					});
				},
			},
		];

		test.each(abandonedStaging)(
			'does not commit on a later poll a mutation left by $title',
			async ({ stage }) => {
				await stage();

				await context.__runPoll(async () => {
					await context.__commitCursor();
				});

				expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
			},
		);

		test.each(abandonedStaging)(
			'does not emit on a later poll a mutation left by $title',
			async ({ stage }) => {
				await stage();

				await context.__runPoll(async () => {
					context.__emit(pollData);
				});
				await sleep(0);

				expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			},
		);

		test('gives each of two overlapping polls of one node the snapshot it mutated itself', async () => {
			const slowPoll = context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'slow' });
				await sleep(10);
				context.__emit(pollData);
			});

			const fastPoll = context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'fast' });
				context.__emit(pollData);
			});

			await Promise.all([slowPoll, fastPoll]);
			await sleep(0);

			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledTimes(2);
			const cursors = workflowExecutionService.runPolledWorkflow.mock.calls.map((call) => call[5]);
			expect(cursors).toEqual([{ lastItemId: 'fast' }, { lastItemId: 'slow' }]);
		});

		describe('getPollBudgetMs', () => {
			const buildBudgetContext = (
				pollTimeoutSeconds: number,
				leaseDurationSeconds: number,
				fence?: { taskId: string; leaseEpoch: number },
			) => {
				const globalConfig = mock<GlobalConfig>({
					scheduler: { pollTimeoutSeconds, leaseDurationSeconds },
				});
				const budgetFactory = new TriggerExecutionContextFactory(
					mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) }),
					errorReporter,
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
					globalConfig,
					engineV2ActiveTriggers,
				);
				const getPollFunctions = budgetFactory.getExecutePollFunctions(
					mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
					additionalData,
					mode,
					activation,
					async () => mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
					fence,
				);
				return getPollFunctions(workflow, node, additionalData, mode, activation);
			};

			const fence = { taskId: 'task-1', leaseEpoch: 1 };

			// Budget = min(poll timeout, lease duration) minus a margin of
			// max(20%, 5s), so a node that exhausts it still finishes its
			// in-flight batch before the engine abandons the tick.
			test.each([
				{ pollTimeoutSeconds: 45, leaseDurationSeconds: 60, expected: 36_000 },
				{ pollTimeoutSeconds: 100, leaseDurationSeconds: 60, expected: 48_000 },
				// The margin never eats more than half the ceiling, so a tiny (but
				// schema-valid) timeout still yields a positive budget.
				{ pollTimeoutSeconds: 4, leaseDurationSeconds: 60, expected: 2_000 },
			])(
				'derives $expected ms from a $pollTimeoutSeconds s timeout under a $leaseDurationSeconds s lease',
				({ pollTimeoutSeconds, leaseDurationSeconds, expected }) => {
					const budgetContext = buildBudgetContext(pollTimeoutSeconds, leaseDurationSeconds, fence);
					expect(budgetContext.getPollBudgetMs()).toBe(expected);
				},
			);

			test('keeps the generous PollContext default for a poll that runs without a lease', () => {
				// The legacy in-memory path has no poll timeout and no lease, so the
				// scheduler-derived budget must not apply there.
				const budgetContext = buildBudgetContext(45, 60);
				expect(budgetContext.getPollBudgetMs()).toBe(300_000);
			});
		});

		test('throws when the node reads its static data outside of a poll', () => {
			expect(() => context.getWorkflowStaticData('node')).toThrow(UnexpectedError);
		});

		test('keeps the mutations of two poll nodes built from one factory apart', async () => {
			const firstNode = mock<INode>({ id: 'node-1', name: 'First Poll Node' });
			const secondNode = mock<INode>({ id: 'node-2', name: 'Second Poll Node' });

			const getPollFunctions = factory.getExecutePollFunctions(
				mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				additionalData,
				mode,
				activation,
				async () => mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
			);
			const firstContext = getPollFunctions(
				workflow,
				firstNode,
				additionalData,
				mode,
				activation,
			) as RunnablePollFunctions;
			const secondContext = getPollFunctions(
				workflow,
				secondNode,
				additionalData,
				mode,
				activation,
			) as RunnablePollFunctions;

			await firstContext.__runPoll(async () => {
				Object.assign(firstContext.getWorkflowStaticData('node'), { lastItemId: 'first-only' });

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
				undefined,
				undefined,
			);
		});

		test('keeps the committed cursor safe from a later mutation of the node static data', async () => {
			await context.__runPoll(async () => {
				const nodeStaticData = context.getWorkflowStaticData('node');
				Object.assign(nodeStaticData, { lastItemId: 'a' });
				await context.__commitCursor();
				nodeStaticData.lastItemId = 'mutated-after-commit';
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledWith(
				expect.objectContaining({ cursor: { lastItemId: 'a' } }),
			);
		});

		test.each([
			{ title: 'left the static data unchanged', stage: () => {}, committed: null },
			{
				title: 'mutated then reverted the static data to its seeded value',
				stage: () => {
					const nodeStaticData = context.getWorkflowStaticData('node');
					nodeStaticData.lastItemId = 'a';
					delete nodeStaticData.lastItemId;
				},
				committed: null,
			},
			{
				title: 'mutated the static data',
				stage: () => Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' }),
				committed: { lastItemId: 'a' },
			},
		])('commits $committed when the poll $title', async ({ stage, committed }) => {
			await context.__runPoll(async () => {
				stage();
				await context.__commitCursor();
			});

			if (committed === null) {
				expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
			} else {
				expect(pollCursorService.commitCursorOnly).toHaveBeenCalledWith({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: committed,
				});
			}
		});

		test('detects a nested mutation of the seeded static data and commits an independent copy', async () => {
			pollCursorService.resolveCursor.mockResolvedValue({
				migrated: true,
				cursor: { page: { offset: 1 }, seenIds: ['a'] },
			});

			await context.__runPoll(async () => {
				const nodeStaticData = context.getWorkflowStaticData('node') as {
					page: { offset: number };
					seenIds: string[];
				};
				nodeStaticData.page.offset = 2;
				nodeStaticData.seenIds.push('b');
				await context.__commitCursor();
				nodeStaticData.seenIds.push('mutated-after-commit');
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { page: { offset: 2 }, seenIds: ['a', 'b'] },
			});
		});

		test.each([
			{
				title: 'a second commit in the same poll',
				carry: async () => {
					await context.__commitCursor();
					await context.__commitCursor();
				},
				commits: 1,
				polledRuns: 0,
				legacyRuns: 0,
			},
			{
				title: 'a commit after an emit already carried it',
				carry: async () => {
					context.__emit(pollData);
					await sleep(0);
					await context.__commitCursor();
				},
				commits: 0,
				polledRuns: 1,
				legacyRuns: 0,
			},
			{
				title: 'an emit after a commit already carried it',
				carry: async () => {
					await context.__commitCursor();
					context.__emit(pollData);
					await sleep(0);
				},
				commits: 1,
				polledRuns: 0,
				legacyRuns: 1,
			},
		])(
			'carries a mutation exactly once, given $title',
			async ({ carry, commits, polledRuns, legacyRuns }) => {
				await context.__runPoll(async () => {
					Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
					await carry();
				});
				await sleep(0);

				expect(pollCursorService.commitCursorOnly).toHaveBeenCalledTimes(commits);
				expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledTimes(polledRuns);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(legacyRuns);
			},
		);

		test('propagates a failing cursor commit to the engine that called it', async () => {
			const commitError = new Error('poller state write failed');
			pollCursorService.commitCursorOnly.mockRejectedValue(commitError);

			await expect(
				context.__runPoll(async () => {
					Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
					await context.__commitCursor();
				}),
			).rejects.toThrow(commitError);
		});

		test('logs a failing polled run rather than leaving the rejection unhandled', async () => {
			const runError = new Error('the polled run could not be committed');
			workflowExecutionService.runPolledWorkflow.mockRejectedValue(runError);

			await context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
				context.__emit(pollData);
			});
			await sleep(0);

			expect(scopedLogger.error).toHaveBeenCalledWith(
				runError.message,
				expect.objectContaining({ error: runError }),
			);
		});

		test('resolves donePromise with undefined when the polled run is fenced out', async () => {
			workflowExecutionService.runPolledWorkflow.mockResolvedValue(undefined);
			const donePromise = createDeferredPromise<IRun>();

			await context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
				context.__emit(pollData, undefined, donePromise);
			});

			await expect(donePromise.promise).resolves.toBeUndefined();
			expect(activeExecutions.getPostExecutePromise).not.toHaveBeenCalled();
		});

		test('does not throw and logs when a fenced cursor-only commit is rejected', async () => {
			pollCursorService.commitCursorOnly.mockResolvedValue(false);

			await context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
				await context.__commitCursor();
			});

			expect(scopedLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('the poll no longer holds its lease'),
				{ workflowId: 'wf-1', nodeId: 'node-1', nodeName: 'Poll Node' },
			);
		});

		test('does not retry a fenced-out cursor advance, while a later poll still commits its own', async () => {
			pollCursorService.commitCursorOnly.mockResolvedValue(false);

			await context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'a' });
				await context.__commitCursor();
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledTimes(1);

			await context.__runPoll(async () => {
				Object.assign(context.getWorkflowStaticData('node'), { lastItemId: 'b' });
				await context.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledTimes(2);
			expect(pollCursorService.commitCursorOnly).toHaveBeenLastCalledWith(
				expect.objectContaining({ cursor: { lastItemId: 'b' } }),
			);
		});

		test('threads a fence through to both the polled run and the cursor-only commit', async () => {
			const fence = { taskId: 'task-1', leaseEpoch: 3 };
			const getPollFunctions = factory.getExecutePollFunctions(
				mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				additionalData,
				mode,
				activation,
				async () => mock<IWorkflowBase>({ id: 'wf-1', name: 'Test Workflow' }),
				fence,
			);
			const fencedContext = getPollFunctions(
				workflow,
				node,
				additionalData,
				mode,
				activation,
			) as RunnablePollFunctions;

			await fencedContext.__runPoll(async () => {
				Object.assign(fencedContext.getWorkflowStaticData('node'), { lastItemId: 'a' });
				fencedContext.__emit(pollData);
			});
			await sleep(0);

			expect(workflowExecutionService.runPolledWorkflow).toHaveBeenCalledWith(
				expect.anything(),
				node,
				pollData,
				additionalData,
				mode,
				{ lastItemId: 'a' },
				undefined,
				fence,
			);

			await fencedContext.__runPoll(async () => {
				Object.assign(fencedContext.getWorkflowStaticData('node'), { lastItemId: 'b' });
				await fencedContext.__commitCursor();
			});

			expect(pollCursorService.commitCursorOnly).toHaveBeenCalledWith(
				expect.objectContaining({ fence }),
			);
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
			// No per-occurrence deduplication key is threaded; the trailing arguments are the
			// lease fence and the prefetched cursor, which this path has neither of.
			expect(getExecutePollFunctionsSpy).toHaveBeenCalledWith(
				workflowData,
				additionalData,
				'trigger',
				'update',
				expect.any(Function),
				undefined,
				undefined,
			);

			expect(getPollFunctions).toHaveBeenCalledWith(
				result.workflow,
				pollNode,
				additionalData,
				'trigger',
				'update',
			);
		});

		test('threads a given fence through to getExecutePollFunctions', async () => {
			const workflowData = buildWorkflowData();
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const pollFunctions = mock<IPollFunctions>();
			const getPollFunctions = vi.fn().mockReturnValue(pollFunctions);
			const getExecutePollFunctionsSpy = vi
				.spyOn(factory, 'getExecutePollFunctions')
				.mockReturnValue(getPollFunctions as unknown as IGetExecutePollFunctions);
			const fence = { taskId: 'task-1', leaseEpoch: 3 };

			await factory.createPollExecutionContext(workflowData, pollNode, fence);

			expect(getExecutePollFunctionsSpy).toHaveBeenCalledWith(
				workflowData,
				additionalData,
				'trigger',
				'update',
				expect.any(Function),
				fence,
				undefined,
			);
		});

		test('threads a prefetched cursor through to getExecutePollFunctions', async () => {
			const workflowData = buildWorkflowData();
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const pollFunctions = mock<IPollFunctions>();
			const getPollFunctions = vi.fn().mockReturnValue(pollFunctions);
			const getExecutePollFunctionsSpy = vi
				.spyOn(factory, 'getExecutePollFunctions')
				.mockReturnValue(getPollFunctions as unknown as IGetExecutePollFunctions);
			const fence = { taskId: 'task-1', leaseEpoch: 3 };
			const prefetched = { lastItemId: 'prefetched' };

			await factory.createPollExecutionContext(workflowData, pollNode, fence, prefetched);

			expect(getExecutePollFunctionsSpy).toHaveBeenCalledWith(
				workflowData,
				additionalData,
				'trigger',
				'update',
				expect.any(Function),
				fence,
				prefetched,
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

	describe('findPublishedWorkflowData', () => {
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
			'returns null instead of throwing when the service returns null ($description)',
			async ({ options, calledMethod, skippedMethod }) => {
				workflowPublishedDataService[calledMethod].mockResolvedValue(null);

				await expect(factory.findPublishedWorkflowData('wf-1', options)).resolves.toBeNull();
				expect(workflowPublishedDataService[calledMethod]).toHaveBeenCalledWith('wf-1');
				expect(workflowPublishedDataService[skippedMethod]).not.toHaveBeenCalled();
			},
		);

		test('returns the published workflow data when it exists', async () => {
			const workflowData = buildPublishedWorkflowData();
			workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution.mockResolvedValue(
				workflowData,
			);

			await expect(factory.findPublishedWorkflowData('wf-1')).resolves.toBe(workflowData);
		});
	});

	describe('on engine 2.0', () => {
		/** An attachment already written to storage, so it has an id to delete. */
		const storedFile = mock<IBinaryData>({ id: 'filesystem:abc', mimeType: 'text/plain' });

		const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const mode: WorkflowExecuteMode = 'trigger';
		const activation: WorkflowActivateMode = 'activate';
		const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });

		const triggerContext = () => {
			const getTriggerFunctions = factory.getExecuteTriggerFunctions(
				workflowData,
				additionalData,
				mode,
				activation,
				async () => workflowData,
				mock<TriggerFailureHandler>(),
				scheduleCollectionSession,
			);
			return getTriggerFunctions(
				workflow,
				mock<INode>({ name: 'Trigger Node' }),
				additionalData,
				mode,
				activation,
			);
		};

		const pollContext = () => {
			const getPollFunctions = factory.getExecutePollFunctions(
				workflowData,
				additionalData,
				mode,
				activation,
				async () => workflowData,
			);
			return getPollFunctions(
				workflow,
				mock<INode>({ name: 'Poll Node' }),
				additionalData,
				mode,
				activation,
			);
		};

		describe('an active trigger', () => {
			beforeEach(() => {
				engineV2Dispatcher.handlesWorkflow.mockReturnValue(true);
			});

			test('hands a plain emit to the runner, which dispatches it', async () => {
				triggerContext().emit([[{ json: {} }]]);
				await sleep(0);

				expect(workflowExecutionService.runWorkflow).toHaveBeenCalled();
			});

			test('refuses an emit that waits for its run, and starts nothing', async () => {
				const donePromise = createDeferredPromise<IRun>();

				triggerContext().emit([[{ json: {} }]], undefined, donePromise);
				// Attached before the flush, as the nodes do: they await the promise on the
				// line after `emit`, so the rejection is never unhandled.
				const refused = expect(donePromise.promise).rejects.toThrow(
					'Engine 2.0 cannot run a trigger that waits for its execution to finish yet',
				);

				await sleep(0);

				expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
				await refused;
			});

			test('refuses an emit carrying a file, and deletes what it stored', async () => {
				const data: INodeExecutionData[][] = [[{ json: {}, binary: { attachment: storedFile } }]];

				triggerContext().emit(data);
				await sleep(0);

				expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
				// No execution will ever own the file, so nothing else would reclaim it.
				expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
					'filesystem:abc',
				]);
			});

			test('deletes the files even when the emit is refused for waiting on its run', async () => {
				const data: INodeExecutionData[][] = [[{ json: {}, binary: { attachment: storedFile } }]];
				const donePromise = createDeferredPromise<IRun>();

				triggerContext().emit(data, undefined, donePromise);
				const refused = expect(donePromise.promise).rejects.toThrow(UserError);

				await sleep(0);

				expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
					'filesystem:abc',
				]);
				await refused;
			});

			test('rejects the response promise too, so the node does not wait forever', async () => {
				const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
				const donePromise = createDeferredPromise<IRun>();

				triggerContext().emit([[{ json: {} }]], responsePromise, donePromise);
				const refused = Promise.all([
					expect(responsePromise.promise).rejects.toThrow(
						'Engine 2.0 cannot run a trigger that waits for its execution to finish yet',
					),
					expect(donePromise.promise).rejects.toThrow(UserError),
				]);

				await sleep(0);
				await refused;
			});
		});

		describe('a poll trigger', () => {
			beforeEach(() => {
				engineV2Dispatcher.handlesWorkflow.mockReturnValue(true);
			});

			test('deletes the attachments the refused poll stored', async () => {
				const data: INodeExecutionData[][] = [[{ json: {}, binary: { attachment: storedFile } }]];

				expect(() => pollContext().__emit(data)).toThrow(UserError);
				await sleep(0);

				expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
					'filesystem:abc',
				]);
			});

			test('refuses the emit and commits no cursor', () => {
				expect(() => pollContext().__emit([[{ json: {} }]])).toThrow(
					'Engine 2.0 cannot run polling triggers yet.',
				);
				expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
				expect(workflowExecutionService.runPolledWorkflow).not.toHaveBeenCalled();
				expect(pollCursorService.commitWithExecution).not.toHaveBeenCalled();
				expect(pollCursorService.commitCursorOnly).not.toHaveBeenCalled();
				expect(workflowStaticDataService.saveStaticData).not.toHaveBeenCalled();
			});
		});

		describe('a workflow that did not opt in', () => {
			test('runs an emit that waits for its run, as it does today', async () => {
				const donePromise = createDeferredPromise<IRun>();

				triggerContext().emit([[{ json: {} }]], undefined, donePromise);
				await sleep(0);

				expect(workflowExecutionService.runWorkflow).toHaveBeenCalled();
			});

			test('runs a polled emit, as it does today', async () => {
				pollContext().__emit([[{ json: {} }]]);
				await sleep(0);

				expect(workflowExecutionService.runWorkflow).toHaveBeenCalled();
			});
		});
	});
});
