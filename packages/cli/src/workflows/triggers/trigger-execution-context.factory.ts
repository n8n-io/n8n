import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	ErrorReporter,
	PollContext,
	StorageConfig,
	TriggerContext,
	type IGetExecutePollFunctions,
	type IGetExecuteTriggerFunctions,
} from 'n8n-core';

import { ActiveExecutions } from '@/active-executions';
import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	INode,
	INodeExecutionData,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { Workflow, UnexpectedError, createRunExecutionData } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { EventService } from '@/events/event.service';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import type { IWorkflowDb } from '@n8n/db';

export type TriggerFailureHandler = (opts: {
	error: Error;
	node: INode;
	workflowData: IWorkflowDb;
	mode: WorkflowExecuteMode;
	activation: WorkflowActivateMode;
}) => void;

/**
 * Builds the execution-context functions (`IGetExecuteTriggerFunctions` /
 * `IGetExecutePollFunctions`) that n8n-core uses to wire up active and poll
 * triggers. Owns the emit logic (dedup handling, donePromise resolution,
 * `workflow-executed` event emission, static-data saves) and the
 * `executeErrorWorkflow` wrapper. Path-specific failure behaviour (e.g.
 * removing a trigger from the registry and queuing a reactivation) is
 * injected via `onTriggerFailure` so this class stays agnostic of the
 * caller's activation strategy.
 */
@Service()
export class TriggerExecutionContextFactory {
	constructor(
		private logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly activeExecutions: ActiveExecutions,
		private readonly eventService: EventService,
		private readonly executionService: ExecutionService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly storageConfig: StorageConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Return trigger function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecuteTriggerFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		// TODO(CAT-3202): this callback lets us switch between reading from
		// the in-memory workflowData (flag off) and the workflow published data
		// service (flag on). Once the feature flag is removed, we'll call the
		// service directly and this parameter will go away.
		resolveWorkflowData: () => Promise<IWorkflowBase>,
		onTriggerFailure: TriggerFailureHandler,
	): IGetExecuteTriggerFunctions {
		return (workflow: Workflow, node: INode) => {
			const emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
				deduplicationKey?: string,
			) => {
				this.logger.debug(`Received trigger for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);

				// TODO(CAT-3202): resolves workflow data via callback so we
				// can feature-flag between in-memory data and the published data
				// service. Once the flag is removed, we'll call the service directly.
				const executePromise = resolveWorkflowData()
					.then(
						async (freshWorkflowData) =>
							await this.workflowExecutionService.runWorkflow(
								freshWorkflowData,
								node,
								data,
								additionalData,
								mode,
								responsePromise,
								deduplicationKey,
							),
					)
					.catch((error: unknown) => {
						if (error instanceof DuplicateExecutionError) {
							const context = {
								workflowId: workflowData.id,
								nodeId: node.id,
								deduplicationKey: error.deduplicationKey,
							};
							this.logger.warn('Scheduled execution skipped: duplicate deduplication key', context);
							this.errorReporter.warn(error, { extra: context, shouldBeLogged: false });
							return undefined;
						}
						throw error;
					});

				void executePromise.then((executionId) => {
					// `executionId` is undefined when the catch above swallowed a
					// duplicate scheduled execution; nothing ran, so nothing to emit.
					if (executionId === undefined) return;
					this.eventService.emit('workflow-executed', {
						workflowId: workflowData.id,
						workflowName: workflowData.name,
						executionId,
						source: 'trigger',
					});
				});

				if (donePromise) {
					void executePromise.then((executionId) => {
						// Same as above: a duplicate scheduled execution was skipped,
						// so resolve with undefined and don't wait on a non-existent run.
						if (executionId === undefined) {
							donePromise.resolve(undefined);
							return;
						}
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
				}
			};

			const emitError = (error: Error): void => {
				onTriggerFailure({ error, node, workflowData, mode, activation });
			};

			const saveFailedExecution = (error: ExecutionError) => {
				this.logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" reported the error: "${error.message}". Saving to failed executions`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};

			return new TriggerContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				emit,
				emitError,
				saveFailedExecution,
			);
		};
	}

	/**
	 * Return poll function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecutePollFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		// TODO(CAT-3202): this callback lets us switch between reading from
		// the in-memory workflowData (flag off) and the workflow published data
		// service (flag on). Once the feature flag is removed, we'll call the
		// service directly and this parameter will go away.
		resolveWorkflowData: () => Promise<IWorkflowBase>,
	): IGetExecutePollFunctions {
		return (workflow: Workflow, node: INode) => {
			const __emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			) => {
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);

				// TODO(CAT-3202): resolves workflow data via callback so we
				// can feature-flag between in-memory data and the published data
				// service. Once the flag is removed, we'll call the service directly.
				const executePromise = resolveWorkflowData().then(
					async (freshWorkflowData) =>
						await this.workflowExecutionService.runWorkflow(
							freshWorkflowData,
							node,
							data,
							additionalData,
							mode,
							responsePromise,
						),
				);

				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					void executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
				}
			};

			const __emitError = (error: ExecutionError) => {
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};

			return new PollContext(workflow, node, additionalData, mode, activation, __emit, __emitError);
		};
	}

	executeErrorWorkflow(
		error: ExecutionError,
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
	): void {
		const fullRunData: IRun = {
			data: createRunExecutionData({
				resultData: {
					error,
					runData: {},
				},
			}),
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'running',
			storedAt: this.storageConfig.modeTag,
		};

		executeErrorWorkflow(workflowData, fullRunData, mode);
	}

	/**
	 * Builds the {@link IWorkflowBase} to execute for an active trigger from the cached
	 * published data. `pinData` and `meta` are deliberately left out — they are
	 * irrelevant to a production trigger execution.
	 *
	 * TODO: Add error handling / fallback strategy for transient DB failures.
	 */
	async loadPublishedWorkflowData(workflowId: string): Promise<IWorkflowBase> {
		const publishedData =
			await this.workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution(
				workflowId,
			);

		if (!publishedData) {
			throw new UnexpectedError('Published version not found for workflow', {
				extra: { workflowId },
			});
		}

		return publishedData;
	}
}
