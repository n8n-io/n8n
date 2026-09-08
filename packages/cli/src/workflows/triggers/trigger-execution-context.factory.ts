import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { IWorkflowDb, PollerCursor, PollLeaseFence } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
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
	IExecuteResponsePromiseData,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	PollCursor,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { Workflow, UnexpectedError, createRunExecutionData } from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';

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
import type { EngineV2ActiveTriggerEmit } from '@/workflows/triggers/engine-v2-active-triggers';
import { EngineV2ActiveTriggers } from '@/workflows/triggers/engine-v2-active-triggers';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';
import { getWorkflowProjectDetailsSafe } from '@/workflows/utils';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

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
		private readonly globalConfig: GlobalConfig,
		private readonly engineV2ActiveTriggers: EngineV2ActiveTriggers,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Bridge an in-flight triggered execution to the node's `donePromise`. It
	 * always settles: with the finished run, with `undefined` when a duplicate
	 * scheduled execution was skipped, or rejected if the execution never
	 * started. Nodes that await it (MQTT, RabbitMQ, AMQP, Kafka) would otherwise
	 * hang forever on failure.
	 */
	private settleDonePromise(
		executePromise: Promise<string | undefined>,
		donePromise: IDeferredPromise<IRun | undefined>,
	) {
		void executePromise
			.then(async (executionId) =>
				executionId === undefined
					? undefined
					: await this.activeExecutions.getPostExecutePromise(executionId),
			)
			.then(donePromise.resolve, (error: unknown) => donePromise.reject(ensureError(error)));
	}

	/**
	 * Refuses an emit the engine 2.0 path cannot carry, settling the response
	 * promise on the way out. `runWorkflow` never receives that promise when the
	 * emit is refused, and an unsettled deferred promise leaves the node waiting.
	 * The done promise needs no help here: {@link settleDonePromise} rejects it
	 * from the returned promise chain.
	 */
	private async assertEngineV2Supported(
		data: INodeExecutionData[][],
		emit: EngineV2ActiveTriggerEmit,
	): Promise<void> {
		try {
			// Files first, because this check deletes what it refuses: a refusal for
			// any other reason would otherwise leave the stored files behind, owned by
			// no execution.
			await this.engineV2ActiveTriggers.assertPayloadSupported(data);
			this.engineV2ActiveTriggers.assertSupported(emit);
		} catch (error) {
			emit.responsePromise?.reject(ensureError(error));
			throw error;
		}
	}

	/**
	 * Terminates the emit promise chains. Without it a failed triggered execution
	 * surfaces as an unhandled rejection instead of a logged error.
	 */
	private logTriggerExecutionFailure(error: unknown, workflowData: IWorkflowBase, node: INode) {
		const failure = ensureError(error);
		this.logger.error(failure.message, {
			error: failure,
			workflowId: workflowData.id,
			nodeName: node.name,
		});
	}

	/**
	 * Persist a failed trigger execution, then run the error workflow for it.
	 */
	private recordTriggerFailure(
		error: ExecutionError,
		node: INode,
		workflowData: IWorkflowBase,
		workflow: Workflow,
		mode: WorkflowExecuteMode,
	) {
		void this.executionService
			.createErrorExecution(error, node, workflowData, workflow, mode)
			.then(() => {
				this.executeErrorWorkflow(error, workflowData, mode);
			})
			.catch((cause: unknown) => {
				const failure = ensureError(cause);
				this.errorReporter.error(failure);
				this.logger.error('Failed to record failed trigger execution', {
					error: failure,
					workflowId: workflowData.id,
					nodeName: node.name,
				});
			});
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
					.then(async (freshWorkflowData) => {
						// Checked against the fresh data, so this agrees with the dispatcher,
						// which decides on the same copy.
						if (this.engineV2ActiveTriggers.handles(freshWorkflowData, mode)) {
							await this.assertEngineV2Supported(data, { responsePromise, donePromise });
						}

						return await this.workflowExecutionService.runWorkflow(
							freshWorkflowData,
							node,
							data,
							additionalData,
							mode,
							responsePromise,
							deduplicationKey,
						);
					})
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

				// Registered ahead of the telemetry chain so the post-execute promise
				// is attached before that chain's ownership lookup yields.
				if (donePromise) this.settleDonePromise(executePromise, donePromise);

				void executePromise
					.then(async (executionId) => {
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
					})
					.catch((error: unknown) => this.logTriggerExecutionFailure(error, workflowData, node));
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
				this.recordTriggerFailure(error, node, workflowData, workflow, mode);
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
		fence?: PollLeaseFence,
		prefetchedCursor?: PollerCursor,
	): IGetExecutePollFunctions {
		return (workflow: Workflow, node: INode) => {
			// A poll must finish inside both the handler's abandon deadline and the task
			// lease; past either, its commits are fenced out or discarded. The margin —
			// 20%, at least 5s, at most half the ceiling — leaves room for the trailing
			// hand-off and cursor commit.
			const ceilingMs =
				Math.min(
					this.globalConfig.scheduler.pollTimeoutSeconds,
					this.globalConfig.scheduler.leaseDurationSeconds,
				) * Time.seconds.toMilliseconds;
			const marginMs = Math.min(Math.max(0.2 * ceilingMs, 5_000), ceilingMs / 2);
			const pollBudgetMs = ceilingMs - marginMs;
			// A poll's staged snapshot lives in an async scope entered per poll, rather
			// than in a variable per node: only the poll that staged it can commit it, and
			// two overlapping polls of the same node never share a slot. An unmigrated
			// node gets no snapshot: it reads and writes the real static-data bucket
			// directly.
			const stagedCursorStore = new AsyncLocalStorage<
				{ migrated: true; snapshot: PollCursor; seed: PollCursor } | { migrated: false }
			>();

			const __runPoll = async <T>(poll: () => Promise<T>): Promise<T> => {
				const resolved = await this.pollCursorService.resolveCursor(
					workflowData.id,
					node.id,
					workflow.getStaticData('node', node),
					prefetchedCursor,
				);
				const store = resolved.migrated
					? { migrated: true as const, snapshot: cloneDeep(resolved.cursor), seed: resolved.cursor }
					: { migrated: false as const };
				return await stagedCursorStore.run(store, poll);
			};

			/**
			 * Returns a copy of the staged snapshot if it changed since it was seeded,
			 * so one advance is committed at most once and a later mutation of the
			 * node's own object can't reach an in-flight commit.
			 */
			const takeStagedCursor = (): PollCursor | null => {
				const staged = stagedCursorStore.getStore();
				if (staged === undefined || !staged.migrated || isEqual(staged.snapshot, staged.seed)) {
					return null;
				}
				const cursor = cloneDeep(staged.snapshot);
				staged.seed = cursor;
				return cursor;
			};

			const __emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			) => {
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);

				// Ahead of the cursor take, so a refused poll leaves its window to be
				// retried. Reads the registration's copy of the workflow rather than the
				// fresh one for the same reason: the fresh read comes too late.
				if (this.engineV2ActiveTriggers.handles(workflowData, mode)) {
					// Detached because `__emit` is synchronous. The poll may have stored
					// attachments, and no execution will ever own them.
					void this.engineV2ActiveTriggers
						.discardFiles(data)
						.catch((error: unknown) => this.logTriggerExecutionFailure(error, workflowData, node));
					this.engineV2ActiveTriggers.assertPollSupported();
				}

				const cursor = takeStagedCursor();

				// A migrated node's cursor lives in `poller_state`, not static data, so
				// saving here can't race the cursor commit; this persists global static
				// data, or an unmigrated node's own bucket, which still doubles as its cursor.
				void this.workflowStaticDataService.saveStaticData(workflow);

				// TODO(CAT-3202): resolves workflow data via callback so we
				// can feature-flag between in-memory data and the published data
				// service. Once the flag is removed, we'll call the service directly.
				const executePromise = resolveWorkflowData().then(async (freshWorkflowData) =>
					cursor === null
						? await this.workflowExecutionService.runWorkflow(
								freshWorkflowData,
								node,
								data,
								additionalData,
								mode,
								responsePromise,
							)
						: await this.workflowExecutionService.runPolledWorkflow(
								freshWorkflowData,
								node,
								data,
								additionalData,
								mode,
								cursor,
								responsePromise,
								fence,
							),
				);

				if (donePromise) this.settleDonePromise(executePromise, donePromise);

				void executePromise.catch((error: unknown) =>
					this.logTriggerExecutionFailure(error, workflowData, node),
				);
			};

			const __emitError = (error: ExecutionError) => {
				this.recordTriggerFailure(error, node, workflowData, workflow, mode);
			};

			// Persists a snapshot advance that emitted no items, so a source that only
			// ever moves its cursor is not re-fetched forever.
			const __commitCursor = async () => {
				const cursor = takeStagedCursor();
				if (cursor === null) return;
				const committed = await this.pollCursorService.commitCursorOnly({
					workflowId: workflowData.id,
					nodeId: node.id,
					cursor,
					fence,
				});
				if (!committed) {
					this.logger.debug(
						`Poll node "${node.name}" cursor-only commit skipped: the poll no longer holds its lease`,
						{ workflowId: workflowData.id, nodeId: node.id, nodeName: node.name },
					);
				}
			};

			// Hands a migrated node its per-poll snapshot in place of the real
			// static-data bucket, so mutations are captured for `takeStagedCursor` above.
			// An unmigrated node gets the real bucket directly.
			const resolveNodeStaticData = () => {
				const staged = stagedCursorStore.getStore();
				if (staged === undefined) {
					throw new UnexpectedError(
						'Poll node read its static data outside of a poll; __runPoll was not entered',
						{ extra: { workflowId: workflowData.id, nodeId: node.id, nodeName: node.name } },
					);
				}
				return staged.migrated ? staged.snapshot : workflow.getStaticData('node', node);
			};

			return new PollContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				__emit,
				__emitError,
				__commitCursor,
				__runPoll,
				resolveNodeStaticData,
				// Only a leased (durable) poll is bounded by the timeout and lease; a
				// legacy in-memory poll keeps PollContext's generous default.
				fence ? () => pollBudgetMs : undefined,
			);
		};
	}

	/**
	 * Assemble the poll execution context: the Workflow, additionalData, and
	 * resolve-at-emit closure needed to run `poll()`. The closure bypasses the
	 * published-workflow cache so it always reads the workflow's current data.
	 */
	async createPollExecutionContext(
		workflowData: IWorkflowBase,
		node: INode,
		fence?: PollLeaseFence,
		prefetchedCursor?: PollerCursor,
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

		const getPollFunctions = this.getExecutePollFunctions(
			workflowData,
			additionalData,
			'trigger',
			'update',
			resolveWorkflowData,
			fence,
			prefetchedCursor,
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
	 * published data, or returns `null` when the workflow has no published
	 * version. `pinData` and `meta` are deliberately left out: they are
	 * irrelevant to a production trigger execution.
	 *
	 * Pass `bypassCache` on the poll path: the poll cursor lives in `poller_state`,
	 * written outside the publish-time cache, so a cached read would be stale.
	 *
	 * TODO: Add error handling / fallback strategy for transient DB failures.
	 */
	async findPublishedWorkflowData(
		workflowId: string,
		{ bypassCache = false }: { bypassCache?: boolean } = {},
	): Promise<IWorkflowBase | null> {
		return bypassCache
			? await this.workflowPublishedDataService.getPublishedWorkflowDataForExecution(workflowId)
			: await this.workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution(
					workflowId,
				);
	}

	/**
	 * Same as {@link findPublishedWorkflowData}, for callers that require a
	 * published version to exist.
	 *
	 * @throws {UnexpectedError} when the workflow has no published version
	 */
	async loadPublishedWorkflowData(
		workflowId: string,
		options: { bypassCache?: boolean } = {},
	): Promise<IWorkflowBase> {
		const publishedData = await this.findPublishedWorkflowData(workflowId, options);

		if (!publishedData) {
			throw new UnexpectedError('Published version not found for workflow', {
				extra: { workflowId },
			});
		}

		return publishedData;
	}
}
