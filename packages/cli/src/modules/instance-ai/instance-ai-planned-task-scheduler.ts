import type { TaskList } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	ThreadTaskStorage,
	applyPlannedTaskPermissions,
	createAllTools,
	startBuildWorkflowAgentTask,
	startDetachedDelegateTask,
	type BackgroundTaskManager,
	type ManagedBackgroundTask,
	type OrchestrationContext,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type RunStateRegistry,
} from '@n8n/instance-ai';

import type { InProcessEventBus } from './event-bus/in-process-event-bus';
import { AUTO_FOLLOW_UP_MESSAGE } from './internal-messages';
import type { TypeORMAgentMemory } from './storage/typeorm-agent-memory';

const ORCHESTRATOR_AGENT_ID = 'agent-001';

const PLANNED_TASK_CONTEXT_VALUE_LIMIT = 1_500;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function stringifyForContextValue(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function truncateContextValue(value: string): string {
	if (value.length <= PLANNED_TASK_CONTEXT_VALUE_LIMIT) return value;
	return `${value.slice(0, PLANNED_TASK_CONTEXT_VALUE_LIMIT)}...`;
}

function buildPlannedTaskConversationContext(
	task: PlannedTaskRecord,
	graph: PlannedTaskGraph | undefined,
): string | undefined {
	if (!graph) return undefined;

	const parts: string[] = [
		`Approved plan task: ${task.title}`,
		`Task id: ${task.id}`,
		`Task kind: ${task.kind}`,
		`Plan run id: ${graph.planRunId}`,
	];

	if (task.workflowId) {
		parts.push(`Target workflow id: ${task.workflowId}`);
	}

	const dependencies = graph.tasks.filter((candidate) => task.deps.includes(candidate.id));
	if (dependencies.length > 0) {
		parts.push('Completed dependency context:');
		for (const dependency of dependencies) {
			const dependencyParts = [
				`- ${dependency.id} (${dependency.kind}, ${dependency.status}): ${dependency.title}`,
			];
			if (dependency.result) {
				dependencyParts.push(`result=${truncateContextValue(dependency.result)}`);
			}
			if (dependency.error) {
				dependencyParts.push(`error=${truncateContextValue(dependency.error)}`);
			}
			if (dependency.outcome) {
				dependencyParts.push(
					`outcome=${truncateContextValue(stringifyForContextValue(dependency.outcome))}`,
				);
			}
			parts.push(dependencyParts.join(' '));
		}
	}

	return parts.join('\n');
}

/**
 * The slice of the orchestrator run loop the scheduler drives back into. The
 * scheduler decides *when* a planned-task follow-up turn must run and *which*
 * checkpoint to re-enter; the host owns the heavy run-loop machinery (run-state
 * registration, executor spawn, trace wiring) and exposes it through these
 * minimal callbacks.
 */
export interface InstanceAiPlannedTaskSchedulerHost {
	/** Re-resolve the run owner and confirm they still have AI Assistant access. */
	revalidateActiveUser(userId: string): Promise<User | null>;

	/** Cancel the live run for a thread (used when the owner lost authorization). */
	cancelRun(threadId: string): void;

	/**
	 * Start a fresh internal orchestrator turn (synthesize / replan / checkpoint
	 * follow-up). Returns the new run ID, or an empty string when a run was
	 * already live and the follow-up was skipped.
	 */
	startInternalFollowUpRun(
		user: User,
		threadId: string,
		message: string,
		messageGroupId?: string,
		isReplanFollowUp?: boolean,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
	): Promise<string>;

	/**
	 * Build the orchestration context used to dispatch planned tasks (sub-agent
	 * builders / delegates), already wired with tracing and the thread's push ref.
	 */
	createPlannedTaskEnvironment(
		user: User,
		threadId: string,
		planRunId: string,
		messageGroupId?: string,
	): Promise<{ orchestrationContext: OrchestrationContext }>;
}

export interface InstanceAiPlannedTaskSchedulerOptions {
	logger: Logger;
	eventBus: InProcessEventBus;
	agentMemory: TypeORMAgentMemory;
	runState: RunStateRegistry<User>;
	backgroundTasks: BackgroundTaskManager;
	maxConcurrentTasksPerThread: number;
	host: InstanceAiPlannedTaskSchedulerHost;
}

/**
 * Drives the planned-task lifecycle for a conversation: projecting the plan
 * graph onto the UI checklist, dispatching ready tasks to sub-agents, and
 * settling completed tasks back into the graph. It also owns checkpoint
 * re-entry — the orchestration that re-opens a checkpoint follow-up turn once
 * its dependent work has finished, including the deferred re-entries that could
 * not fire while a run was live.
 *
 * Scheduling is serialized per thread so concurrent settlements (a background
 * task finishing, a run ending, a checkpoint draining) never interleave passes
 * over the same graph.
 */
export class InstanceAiPlannedTaskScheduler {
	private readonly logger: Logger;

	private readonly eventBus: InProcessEventBus;

	private readonly agentMemory: TypeORMAgentMemory;

	private readonly runState: RunStateRegistry<User>;

	private readonly backgroundTasks: BackgroundTaskManager;

	private readonly maxConcurrentTasksPerThread: number;

	private readonly host: InstanceAiPlannedTaskSchedulerHost;

	/** Per-thread promise chain that serializes schedulePlannedTasks calls. */
	private readonly schedulerLocks = new Map<string, Promise<void>>();

	/**
	 * Checkpoint re-entries that could not fire when their parent-tagged child
	 * settled (an orchestrator run was live, or other parent siblings were
	 * still running). Drained from the post-run cleanup path so the checkpoint
	 * is never left orphaned.
	 */
	private readonly pendingCheckpointReentries = new Map<string, Set<string>>();

	constructor(options: InstanceAiPlannedTaskSchedulerOptions) {
		this.logger = options.logger;
		this.eventBus = options.eventBus;
		this.agentMemory = options.agentMemory;
		this.runState = options.runState;
		this.backgroundTasks = options.backgroundTasks;
		this.maxConcurrentTasksPerThread = options.maxConcurrentTasksPerThread;
		this.host = options.host;
	}

	/** Forget the per-thread scheduler chain when a thread is cleared. */
	clearThreadState(threadId: string): void {
		this.schedulerLocks.delete(threadId);
	}

	private projectPlannedTaskList(graph: PlannedTaskGraph): TaskList {
		return {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				description: task.title,
				status:
					task.status === 'planned'
						? 'todo'
						: task.status === 'running'
							? 'in_progress'
							: task.status === 'succeeded'
								? 'done'
								: task.status,
			})),
		};
	}

	buildPlannedTaskFollowUpMessage(
		type: 'synthesize' | 'replan' | 'checkpoint',
		graph: PlannedTaskGraph,
		options: { failedTask?: PlannedTaskRecord; checkpoint?: PlannedTaskRecord } = {},
	): string {
		const payload: Record<string, unknown> = {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				title: task.title,
				kind: task.kind,
				status: task.status,
				result: task.result,
				error: task.error,
				outcome: task.outcome,
			})),
		};

		if (options.failedTask) {
			payload.failedTask = {
				id: options.failedTask.id,
				title: options.failedTask.title,
				kind: options.failedTask.kind,
				error: options.failedTask.error,
				result: options.failedTask.result,
			};
		}

		if (options.checkpoint) {
			const depOutcomes = graph.tasks
				.filter((t) => options.checkpoint!.deps.includes(t.id))
				.map((t) => ({
					id: t.id,
					title: t.title,
					kind: t.kind,
					status: t.status,
					result: t.result,
					outcome: t.outcome,
				}));
			payload.checkpoint = {
				id: options.checkpoint.id,
				title: options.checkpoint.title,
				instructions: options.checkpoint.spec,
				dependsOn: depOutcomes,
			};
		}

		return `<planned-task-follow-up type="${type}">\n${JSON.stringify(payload, null, 2)}\n</planned-task-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private async createPlannedTaskState() {
		const memory = this.agentMemory;
		const taskStorage = new ThreadTaskStorage(memory);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);
		return { memory, taskStorage, plannedTaskService };
	}

	private async syncPlannedTasksToUi(threadId: string, graph: PlannedTaskGraph): Promise<void> {
		const { taskStorage } = await this.createPlannedTaskState();
		const tasks = this.projectPlannedTaskList(graph);
		await taskStorage.save(threadId, tasks);
		this.eventBus.publish(threadId, {
			type: 'tasks-update',
			runId: graph.planRunId,
			agentId: ORCHESTRATOR_AGENT_ID,
			payload: { tasks },
		});
	}

	/**
	 * Drop any persisted planned-task graph that is still `awaiting_approval`,
	 * and clear the UI checklist. Called on run cancellation and HITL timeout so
	 * stale approval state doesn't linger. A graph in `active` / `awaiting_replan`
	 * is already in-flight and has its own settlement logic.
	 */
	async cancelAwaitingApprovalPlan(threadId: string): Promise<void> {
		try {
			const { plannedTaskService, taskStorage } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			if (!graph || graph.status !== 'awaiting_approval') return;

			await plannedTaskService.clear(threadId);
			await taskStorage.save(threadId, { tasks: [] });
			this.eventBus.publish(threadId, {
				type: 'tasks-update',
				runId: graph.planRunId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { tasks: { tasks: [] }, planItems: [] },
			});
		} catch (error) {
			this.logger.warn('Failed to clean up awaiting_approval plan on cancel', {
				threadId,
				error: getErrorMessage(error),
			});
		}
	}

	private async dispatchPlannedTask(
		task: PlannedTaskRecord,
		context: OrchestrationContext,
		graph?: PlannedTaskGraph,
	): Promise<void> {
		// Plan approval authorizes the task-family's non-destructive tools,
		// so the sub-agent can execute without a redundant second confirmation.
		const taskContext = this.createPlannedTaskContext(task.kind, context);
		const conversationContext = buildPlannedTaskConversationContext(task, graph);

		let started: { taskId: string; agentId: string; result: string } | null = null;

		switch (task.kind) {
			case 'build-workflow':
				started = await startBuildWorkflowAgentTask(taskContext, {
					task: task.spec,
					workflowId: task.workflowId,
					plannedTaskId: task.id,
					conversationContext,
				});
				break;
			case 'delegate':
				started = await startDetachedDelegateTask(taskContext, {
					title: task.title,
					spec: task.spec,
					tools: task.tools ?? [],
					plannedTaskId: task.id,
					conversationContext,
				});
				break;
		}

		if (!started?.taskId) {
			await context.plannedTaskService?.markFailed(context.threadId, task.id, {
				error: started?.result || `Failed to start planned task "${task.title}"`,
			});
			return;
		}

		await context.plannedTaskService?.markRunning(context.threadId, task.id, {
			agentId: started.agentId,
			backgroundTaskId: started.taskId,
		});

		const nextGraph = await context.plannedTaskService?.getGraph(context.threadId);
		if (nextGraph) {
			await this.syncPlannedTasksToUi(context.threadId, nextGraph);
		}
	}

	/**
	 * Creates a task-scoped OrchestrationContext with plan-approved permission
	 * overrides. Rebuilds domain tools so each sub-agent gets its own closure
	 * with the correct permissions, preventing cross-task leakage.
	 */
	private createPlannedTaskContext(
		kind: PlannedTaskRecord['kind'],
		context: OrchestrationContext,
	): OrchestrationContext {
		if (!context.domainContext) return context;

		const taskDomainContext = applyPlannedTaskPermissions(context.domainContext, kind);
		if (taskDomainContext === context.domainContext) return context;

		return {
			...context,
			domainContext: taskDomainContext,
			domainTools: createAllTools(taskDomainContext),
		};
	}

	/**
	 * Resolve the workflow IDs the checkpoint task is verifying so the runWorkflow
	 * permission override can be scoped. Walks the checkpoint's `dependsOn` to find
	 * the build-workflow tasks it depends on and reads their `outcome.workflowId`.
	 * Returns an empty set when the graph is missing or the checkpoint has no
	 * resolved workflow deps (in which case the override applies broadly via the
	 * `allowList === undefined` short-circuit only if we don't set the field).
	 */
	async getCheckpointAllowedWorkflowIds(
		threadId: string,
		checkpointTaskId: string,
	): Promise<ReadonlySet<string>> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint) return new Set();
			const deps = new Set(checkpoint.deps);
			const allowed = new Set<string>();
			for (const task of graph.tasks) {
				if (!deps.has(task.id)) continue;
				const workflowId = task.outcome?.workflowId;
				if (typeof workflowId === 'string' && workflowId.length > 0) {
					allowed.add(workflowId);
				}
			}
			return allowed;
		} catch (error) {
			this.logger.warn('Failed to resolve checkpoint allowed workflow IDs', {
				threadId,
				checkpointTaskId,
				error: getErrorMessage(error),
			});
			return new Set();
		}
	}

	async handlePlannedTaskSettlement(
		user: User,
		task: ManagedBackgroundTask,
		status: 'succeeded' | 'failed' | 'cancelled',
	): Promise<void> {
		if (!task.plannedTaskId) return;

		const { plannedTaskService } = await this.createPlannedTaskState();
		let graph: PlannedTaskGraph | null = null;

		if (status === 'succeeded') {
			graph = await plannedTaskService.markSucceeded(task.threadId, task.plannedTaskId, {
				result: task.result,
				outcome: task.outcome,
			});
		} else if (status === 'failed') {
			graph = await plannedTaskService.markFailed(task.threadId, task.plannedTaskId, {
				error: task.error,
			});
		} else {
			graph = await plannedTaskService.markCancelled(task.threadId, task.plannedTaskId, {
				error: task.error,
			});
		}

		if (graph) {
			await this.syncPlannedTasksToUi(task.threadId, graph);
		}

		await this.schedulePlannedTasks(user, task.threadId);
	}

	async schedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const prev = this.schedulerLocks.get(threadId) ?? Promise.resolve();
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		const current = prev.then(() => this.doSchedulePlannedTasks(user, threadId)).catch(() => {});
		this.schedulerLocks.set(threadId, current);
		await current;
	}

	private async doSchedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const revalidated = await this.host.revalidateActiveUser(user.id);
		if (!revalidated) {
			this.logger.warn('Cancelling run: user no longer authorized for AI Assistant', {
				userId: user.id,
				threadId,
			});
			this.host.cancelRun(threadId);
			return;
		}

		const activeUser = revalidated;

		const { plannedTaskService } = await this.createPlannedTaskState();
		const graph = await plannedTaskService.getGraph(threadId);
		if (!graph) return;

		await this.syncPlannedTasksToUi(threadId, graph);

		const availableSlots = Math.max(
			0,
			this.maxConcurrentTasksPerThread - this.backgroundTasks.getRunningTasks(threadId).length,
		);
		const action = await plannedTaskService.tick(threadId, { availableSlots });
		if (action.type === 'none') return;

		if (action.type === 'replan') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			const startedRunId = await this.host.startInternalFollowUpRun(
				activeUser,
				threadId,
				this.buildPlannedTaskFollowUpMessage('replan', action.graph, {
					failedTask: action.failedTask,
				}),
				action.graph.messageGroupId,
				true,
			);
			// tick() already transitioned the graph to `awaiting_replan`. If the
			// follow-up run couldn't start (live run present), revert the status
			// so the next schedulePlannedTasks() pass can re-emit this action.
			// Without this, tick() returns `none` for non-active graphs and the
			// replan is silently lost.
			if (!startedRunId) {
				await plannedTaskService.revertToActive(threadId);
			}
			return;
		}

		if (action.type === 'synthesize') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			const startedRunId = await this.host.startInternalFollowUpRun(
				activeUser,
				threadId,
				this.buildPlannedTaskFollowUpMessage('synthesize', action.graph),
				action.graph.messageGroupId,
			);
			// Same rollback as replan: tick() transitioned to `completed`, but if
			// the synthesize follow-up didn't actually start, revert so the next
			// tick can emit it again.
			if (!startedRunId) {
				await plannedTaskService.revertToActive(threadId);
			}
			return;
		}

		if (action.type === 'orchestrate-checkpoint') {
			// Defer if a run is already active or suspended. The currently-live
			// run's post-finally reschedule hook will pick this checkpoint up.
			if (this.runState.hasLiveRun(threadId)) {
				return;
			}

			const checkpoint = action.tasks[0];

			// Mark running before starting the follow-up so complete-checkpoint
			// (which requires status === 'running') always sees the correct state.
			// If startInternalFollowUpRun no-ops below (tight race), we roll back
			// the transition to avoid leaving the task in a phantom 'running' state.
			await plannedTaskService.markRunning(threadId, checkpoint.id, {
				agentId: ORCHESTRATOR_AGENT_ID,
			});
			const graphAfterMark = (await plannedTaskService.getGraph(threadId)) ?? action.graph;
			await this.syncPlannedTasksToUi(threadId, graphAfterMark);

			const checkpointRecord =
				graphAfterMark.tasks.find((t) => t.id === checkpoint.id) ?? checkpoint;

			const startedRunId = await this.host.startInternalFollowUpRun(
				activeUser,
				threadId,
				this.buildPlannedTaskFollowUpMessage('checkpoint', graphAfterMark, {
					checkpoint: checkpointRecord,
				}),
				action.graph.messageGroupId,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId: checkpoint.id },
			);

			if (!startedRunId) {
				// Rare race: the outer hasLiveRun check passed but the inner guard
				// in startInternalFollowUpRun did not (another path started a run
				// between our two checks). Revert the checkpoint back to `planned`
				// so the next scheduler tick re-emits `orchestrate-checkpoint` —
				// marking it `failed` here would cascade cancel to every dependent
				// and destroy downstream work even though nothing actually failed.
				this.logger.warn(
					'Checkpoint follow-up run did not start — reverting checkpoint to planned for retry',
					{ threadId, checkpointTaskId: checkpoint.id },
				);
				await plannedTaskService.revertCheckpointToPlanned(threadId, checkpoint.id);
			}
			return;
		}

		const environment = await this.host.createPlannedTaskEnvironment(
			activeUser,
			threadId,
			action.graph.planRunId,
			action.graph.messageGroupId,
		);

		for (const task of action.tasks) {
			await this.dispatchPlannedTask(task, environment.orchestrationContext, action.graph);
		}

		await this.doSchedulePlannedTasks(activeUser, threadId);
	}

	queuePendingCheckpointReentry(threadId: string, checkpointTaskId: string): void {
		let set = this.pendingCheckpointReentries.get(threadId);
		if (!set) {
			set = new Set();
			this.pendingCheckpointReentries.set(threadId, set);
		}
		set.add(checkpointTaskId);
	}

	/**
	 * Drain any checkpoint re-entries whose parent-tagged children settled while
	 * an orchestrator run was live (or while other siblings were still running).
	 * Called from the post-run cleanup path in every run-ending `finally` block,
	 * so the checkpoint is never left orphaned when the settlement path could
	 * not fire immediately.
	 */
	async drainPendingCheckpointReentries(user: User, threadId: string): Promise<void> {
		const set = this.pendingCheckpointReentries.get(threadId);
		if (!set || set.size === 0) return;
		const snapshot = [...set];
		for (const checkpointTaskId of snapshot) {
			// If a new run started while we were draining, stop — the next run's
			// cleanup will pick up the remaining markers.
			if (this.runState.getActiveRunId(threadId) || this.runState.hasSuspendedRun(threadId)) {
				return;
			}
			// A new parent-tagged child is running — let its settlement drive the
			// checkpoint instead of racing another re-entry.
			const siblings = this.backgroundTasks.getRunningTasksByParentCheckpoint(
				threadId,
				checkpointTaskId,
			);
			if (siblings.length > 0) continue;
			set.delete(checkpointTaskId);
			await this.reenterCheckpointById(user, threadId, checkpointTaskId);
		}
		if (set.size === 0) this.pendingCheckpointReentries.delete(threadId);
	}

	/**
	 * Fire a synthetic `<planned-task-follow-up type="checkpoint">` for the
	 * given checkpoint task id when the parent-tagged children that drove it
	 * are no longer running and no new orchestrator run is live. Used by both
	 * the immediate re-entry path (via `maybeReenterParentCheckpoint`) and the
	 * deferred drain (via `drainPendingCheckpointReentries`).
	 */
	async reenterCheckpointById(
		user: User,
		threadId: string,
		checkpointTaskId: string,
		messageGroupId?: string,
	): Promise<boolean> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint || checkpoint.kind !== 'checkpoint') return false;
			if (checkpoint.status !== 'running') return false;

			const startedRunId = await this.host.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('checkpoint', graph, { checkpoint }),
				messageGroupId,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId },
			);
			if (!startedRunId) return false;
			this.logger.debug('Re-entered checkpoint follow-up', {
				threadId,
				checkpointTaskId,
				messageGroupId,
			});
			return true;
		} catch (error) {
			this.logger.error('Failed to re-enter checkpoint follow-up', {
				threadId,
				checkpointTaskId,
				error: getErrorMessage(error),
			});
			return false;
		}
	}

	/**
	 * When a direct background task (builder/research/data-table/delegate)
	 * settles and was spawned inside a checkpoint follow-up, try to re-enter
	 * that checkpoint so the orchestrator can call `complete-checkpoint`.
	 *
	 * Returns `true` only when a follow-up was actually started. Returns
	 * `false` in every other case (checkpoint no longer running, siblings
	 * still in-flight, an orchestrator run is active or suspended, or the
	 * graph no longer has the checkpoint). The caller is responsible for
	 * queuing a deferred re-entry in the false case — never falling through
	 * to a generic `<background-task-completed>` shell, which would re-open
	 * the orphan bug.
	 */
	async maybeReenterParentCheckpoint(
		user: User,
		threadId: string,
		task: ManagedBackgroundTask,
	): Promise<boolean> {
		const parentCheckpointId = task.parentCheckpointId;
		if (!parentCheckpointId) return false;

		// If other parent-tagged children are still running, let the LAST one
		// re-drive the checkpoint; emitting multiple re-dispatches would race.
		const siblings = this.backgroundTasks
			.getRunningTasksByParentCheckpoint(threadId, parentCheckpointId)
			.filter((t) => t.taskId !== task.taskId);
		if (siblings.length > 0) return false;

		// If a run is live, defer — startInternalFollowUpRun would be rejected
		// and we must not fall through to the shell path.
		if (this.runState.getActiveRunId(threadId) || this.runState.hasSuspendedRun(threadId)) {
			return false;
		}

		return await this.reenterCheckpointById(
			user,
			threadId,
			parentCheckpointId,
			task.messageGroupId,
		);
	}

	async finalizeCheckpointFollowUp(
		user: User,
		threadId: string,
		checkpointTaskId: string,
	): Promise<void> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const task = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (task && task.status === 'running') {
				// If the orchestrator spawned a detached sub-agent inside this
				// checkpoint's turn (builder, research, data-table, delegate) and
				// that child is still running, leave the checkpoint running. The
				// child's settlement path re-emits `orchestrate-checkpoint` so the
				// orchestrator re-enters the same checkpoint context and can then
				// call `complete-checkpoint`.
				const inflightChildren = this.backgroundTasks.getRunningTasksByParentCheckpoint(
					threadId,
					checkpointTaskId,
				);
				if (inflightChildren.length > 0) {
					this.logger.debug(
						'Checkpoint run ended with in-flight child tasks — deferring finalization',
						{
							threadId,
							checkpointTaskId,
							inflightTaskIds: inflightChildren.map((t) => t.taskId),
						},
					);
				} else {
					this.logger.warn('Checkpoint run ended without reporting completion — marking failed', {
						threadId,
						checkpointTaskId,
					});
					await plannedTaskService.markCheckpointFailed(threadId, checkpointTaskId, {
						error: 'Checkpoint run ended without reporting completion',
					});
					const nextGraph = await plannedTaskService.getGraph(threadId);
					if (nextGraph) {
						await this.syncPlannedTasksToUi(threadId, nextGraph);
					}
				}
			}
		} catch (error) {
			this.logger.error('Checkpoint finalization failed', {
				threadId,
				checkpointTaskId,
				error: getErrorMessage(error),
			});
		}

		await this.schedulePlannedTasks(user, threadId);
	}
}
