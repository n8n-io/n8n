import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import {
	ErrorReporter,
	PollContext,
	StorageConfig,
	TriggerContext,
	type IGetExecutePollFunctions,
	type IGetExecuteTriggerFunctions,
} from 'n8n-core';
import type {
	ExecutionError,
	IDataObject,
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
import { Workflow, UnexpectedError, createRunExecutionData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { EventService } from '@/events/event.service';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import { ExecutionService } from '@/executions/execution.service';
import { NodeTypes } from '@/node-types';
import type { ScheduleTriggerCollectionSession } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import { OwnershipService } from '@/services/ownership.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { getWorkflowProjectDetailsSafe } from '@/workflows/utils';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { PollCursorService } from './poll-cursor.service';

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
		private readonly scheduleTriggerJobRegistrar: ScheduleTriggerJobRegistrar,
		private readonly ownershipService: OwnershipService,
		private readonly nodeTypes: NodeTypes,
		private readonly pollCursorService: PollCursorService,
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
		// This activation attempt's rule-collection session. Owned by the caller
		// so the commit/discard that follows registration consumes the rules this
		// attempt collected, never a concurrent attempt's.
		scheduleCollectionSession: ScheduleTriggerCollectionSession,
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

				void executePromise.then(async (executionId) => {
					// `executionId` is undefined when the catch above swallowed a
					// duplicate scheduled execution; nothing ran, so nothing to emit.
					if (executionId === undefined) return;
					const { projectId, projectName } = await getWorkflowProjectDetailsSafe(
						this.ownershipService,
						workflowData.id,
					);
					this.eventService.emit('workflow-executed', {
						workflowId: workflowData.id,
						workflowName: workflowData.name,
						executionId,
						projectId,
						projectName,
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

			const schedulingFunctions = this.scheduleTriggerJobRegistrar.interceptsNode(node)
				? scheduleCollectionSession.createCollector(workflow, node)
				: undefined;

			return new TriggerContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				emit,
				emitError,
				saveFailedExecution,
				schedulingFunctions,
			);
		};
	}

	/**
	 * Return poll function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecutePollFunctions(
		workflowData: IWorkflowBase,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		// TODO(CAT-3202): this callback lets us switch between reading from
		// the in-memory workflowData (flag off) and the workflow published data
		// service (flag on). Once the feature flag is removed, we'll call the
		// service directly and this parameter will go away.
		resolveWorkflowData: () => Promise<IWorkflowBase>,
		cursor?: IDataObject,
	): IGetExecutePollFunctions {
		return (workflow: Workflow, node: INode) => {
			// `__emit` reads the staged cursor off the context, and the context needs `__emit`
			// to construct. The holder breaks that cycle; it is filled before the context is
			// handed out, and `__emit` only runs once `poll()` has returned.
			const held: { context?: PollContext } = {};

			const __emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			) => {
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);

				const stagedCursor = held.context?.__takeStagedCursor();

				// A node that staged a cursor has its state committed with the execution
				// below. One that did not still keeps it in static data, whether because
				// it has not been moved onto the cursor API or because it holds state the
				// cursor does not cover, so the two stores coexist per node rather than
				// per instance.
				const commitsCursor = this.pollCursorService.enabled && stagedCursor !== undefined;

				if (!commitsCursor) {
					void this.workflowStaticDataService.saveStaticData(workflow);
				}

				// TODO(CAT-3202): resolves workflow data via callback so we
				// can feature-flag between in-memory data and the published data
				// service. Once the flag is removed, we'll call the service directly.
				const executePromise = resolveWorkflowData().then(async (freshWorkflowData) =>
					commitsCursor
						? await this.workflowExecutionService.runPolledWorkflow(
								freshWorkflowData,
								node,
								data,
								additionalData,
								mode,
								workflow,
								stagedCursor,
								responsePromise,
							)
						: await this.workflowExecutionService.runWorkflow(
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

			held.context = new PollContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				__emit,
				__emitError,
				cursor,
			);
			return held.context;
		};
	}

	/**
	 * Assemble the poll execution context: the Workflow, additionalData, and
	 * resolve-at-emit closure needed to run `poll()`. The closure re-reads the
	 * published workflow instead of using the cached copy, so it runs against
	 * the definition as of just before the poll fired.
	 */
	async createPollExecutionContext(
		workflowData: IWorkflowBase,
		node: INode,
	): Promise<{ workflow: Workflow; pollFunctions: IPollFunctions }> {
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflowData.id,
			workflowSettings: workflowData.settings,
		});

		const resolveWorkflowData = async () =>
			await this.loadPublishedWorkflowData(workflowData.id, { bypassCache: true });

		const cursor = this.pollCursorService.enabled
			? await this.pollCursorService.readCursor(workflow, node)
			: undefined;

		const getPollFunctions = this.getExecutePollFunctions(
			workflowData,
			additionalData,
			'trigger',
			'update',
			resolveWorkflowData,
			cursor,
		);
		// getPollFunctions already closed over these; its signature still requires them.
		const pollFunctions = getPollFunctions(workflow, node, additionalData, 'trigger', 'update');

		return { workflow, pollFunctions };
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
	 * Builds the {@link IWorkflowBase} to execute for an active trigger from the
	 * published data. `pinData` and `meta` are deliberately left out: they are
	 * irrelevant to a production trigger execution.
	 *
	 * Pass `bypassCache` on the poll path: a poll may have just changed the node's
	 * stored cursor, and a cached read would still show the value from before it ran.
	 *
	 * TODO: Add error handling / fallback strategy for transient DB failures.
	 */
	async loadPublishedWorkflowData(
		workflowId: string,
		{ bypassCache = false }: { bypassCache?: boolean } = {},
	): Promise<IWorkflowBase> {
		const publishedData = bypassCache
			? await this.workflowPublishedDataService.getPublishedWorkflowDataForExecution(workflowId)
			: await this.workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution(
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
