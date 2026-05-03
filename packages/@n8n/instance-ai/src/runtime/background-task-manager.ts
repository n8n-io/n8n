import type { BackgroundTaskResult, InstanceAiTraceContext } from '../types';

export type BackgroundTaskStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ManagedBackgroundTask {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	status: BackgroundTaskStatus;
	result?: string;
	error?: string;
	startedAt: number;
	abortController: AbortController;
	corrections: string[];
	/** Callback resolved when a new correction is queued. Re-created by the consumer after each notification. */
	onCorrectionQueued?: () => void;
	messageGroupId?: string;
	outcome?: Record<string, unknown>;
	plannedTaskId?: string;
	workItemId?: string;
	traceContext?: InstanceAiTraceContext;
	/** Identity used for single-flight dedupe lookups; copied from the spawn options. */
	dedupeKey?: BackgroundTaskDedupeKey;
	/**
	 * The checkpoint task id this background task was spawned under, when the
	 * orchestrator called a detached sub-agent tool inside a
	 * `<planned-task-follow-up type="checkpoint">` turn. The checkpoint safety
	 * net uses this to tell "orchestrator exited silently" apart from
	 * "orchestrator handed off to an in-flight patch builder".
	 */
	parentCheckpointId?: string;
}

export interface BackgroundTaskDedupeKey {
	/** Planned-task graph ID this background task is dispatched for. Primary dedupe key. */
	plannedTaskId?: string;
	/** Target workflow ID for this background task. Fallback dedupe key when there is no planned task. */
	workflowId?: string;
	/** Agent role (e.g. 'workflow-builder'). Scopes the workflowId fallback so different roles against the same workflow don't collide. */
	role: string;
}

export interface SpawnManagedBackgroundTaskOptions {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	messageGroupId?: string;
	plannedTaskId?: string;
	workItemId?: string;
	traceContext?: InstanceAiTraceContext;
	/**
	 * Identity for single-flight dedupe. When supplied, a spawn with the same `plannedTaskId`
	 * (primary) or `role + workflowId` (fallback) as a currently-running task returns
	 * `{ status: 'duplicate', existing }` instead of launching a second task.
	 */
	dedupeKey?: BackgroundTaskDedupeKey;
	/**
	 * Link this background task to a running checkpoint in the planned-task
	 * graph. Set when the orchestrator spawns a detached sub-agent (builder,
	 * research, data-table, delegate) from inside a
	 * `<planned-task-follow-up type="checkpoint">` turn. The post-run safety
	 * net defers failing the checkpoint while any child with this id is still
	 * running, and the settlement path re-emits the checkpoint follow-up when
	 * the last child settles.
	 */
	parentCheckpointId?: string;
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
		waitForCorrection: () => Promise<void>,
	) => Promise<string | BackgroundTaskResult>;
	onLimitReached?: (errorMessage: string) => void;
	onCompleted?: (task: ManagedBackgroundTask) => void | Promise<void>;
	onFailed?: (task: ManagedBackgroundTask) => void | Promise<void>;
	onSettled?: (task: ManagedBackgroundTask) => void | Promise<void>;
}

export type SpawnManagedBackgroundTaskResult =
	| { status: 'started'; task: ManagedBackgroundTask }
	| { status: 'limit-reached' }
	| { status: 'duplicate'; existing: ManagedBackgroundTask };

export interface BackgroundTaskMessageOptions<
	TTask extends ManagedBackgroundTask = ManagedBackgroundTask,
> {
	formatTask?: (task: TTask) => Promise<string> | string;
}

export class BackgroundTaskManager {
	private readonly tasks = new Map<string, ManagedBackgroundTask>();
	/** plannedTaskId → taskId for the currently-running task. Populated only when the caller provides a dedupeKey with plannedTaskId. */
	private readonly byPlannedTaskId = new Map<string, string>();
	/**
	 * `${role}:${workflowId}` → taskId for the currently-running task. Only
	 * populated (and only consulted) when the caller provides a dedupeKey
	 * WITHOUT a plannedTaskId. When both keys are present we treat
	 * plannedTaskId as the canonical identity — two distinct planned tasks may
	 * legitimately target the same workflow (e.g., build + later patch) and
	 * must not collapse into each other.
	 */
	private readonly byRoleAndWorkflowId = new Map<string, string>();

	constructor(private readonly maxConcurrentPerThread = 5) {}

	private workflowKey(role: string, workflowId: string): string {
		return `${role}:${workflowId}`;
	}

	private findDuplicate(
		dedupeKey: BackgroundTaskDedupeKey | undefined,
	): ManagedBackgroundTask | undefined {
		if (!dedupeKey) return undefined;
		if (dedupeKey.plannedTaskId) {
			// plannedTaskId is the canonical identity when present — we must NOT
			// fall back to the workflowId index, otherwise distinct planned tasks
			// targeting the same (role, workflowId) would falsely collapse.
			const existingId = this.byPlannedTaskId.get(dedupeKey.plannedTaskId);
			if (existingId) {
				const existing = this.tasks.get(existingId);
				if (existing && existing.status === 'running') return existing;
			}
			return undefined;
		}
		if (dedupeKey.workflowId) {
			const existingId = this.byRoleAndWorkflowId.get(
				this.workflowKey(dedupeKey.role, dedupeKey.workflowId),
			);
			if (existingId) {
				const existing = this.tasks.get(existingId);
				if (existing && existing.status === 'running') return existing;
			}
		}
		return undefined;
	}

	getTaskSnapshots(threadId: string): ManagedBackgroundTask[] {
		return [...this.tasks.values()].filter((task) => task.threadId === threadId);
	}

	getRunningTasks(threadId: string): ManagedBackgroundTask[] {
		return [...this.tasks.values()].filter(
			(task) => task.threadId === threadId && task.status === 'running',
		);
	}

	/**
	 * Return all running background tasks on this thread that were spawned
	 * under the given checkpoint task id. Used by the checkpoint safety net to
	 * defer failing a checkpoint while a detached patch/research/data-table
	 * sub-agent it just launched is still in-flight.
	 */
	getRunningTasksByParentCheckpoint(
		threadId: string,
		checkpointTaskId: string,
	): ManagedBackgroundTask[] {
		return [...this.tasks.values()].filter(
			(task) =>
				task.threadId === threadId &&
				task.status === 'running' &&
				task.parentCheckpointId === checkpointTaskId,
		);
	}

	queueCorrection(
		threadId: string,
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		const task = this.tasks.get(taskId);
		if (!task || task.threadId !== threadId) return 'task-not-found';
		if (task.status !== 'running') return 'task-completed';
		task.corrections.push(correction);
		if (task.onCorrectionQueued) {
			const notify = task.onCorrectionQueued;
			task.onCorrectionQueued = undefined;
			notify();
		}
		return 'queued';
	}

	cancelTask(threadId: string, taskId: string): ManagedBackgroundTask | undefined {
		const task = this.tasks.get(taskId);
		if (!task || task.threadId !== threadId || task.status !== 'running') return undefined;

		task.abortController.abort();
		task.status = 'cancelled';
		this.tasks.delete(taskId);
		this.releaseDedupeIndices(task);
		return task;
	}

	cancelThread(threadId: string): ManagedBackgroundTask[] {
		const cancelled: ManagedBackgroundTask[] = [];
		for (const [taskId, task] of this.tasks) {
			if (task.threadId !== threadId || task.status !== 'running') continue;
			task.abortController.abort();
			task.status = 'cancelled';
			cancelled.push(task);
			this.tasks.delete(taskId);
			this.releaseDedupeIndices(task);
		}
		return cancelled;
	}

	cancelAll(): ManagedBackgroundTask[] {
		const cancelled: ManagedBackgroundTask[] = [];
		for (const [taskId, task] of this.tasks) {
			task.abortController.abort();
			cancelled.push(task);
			this.tasks.delete(taskId);
			this.releaseDedupeIndices(task);
		}
		return cancelled;
	}

	spawn(options: SpawnManagedBackgroundTaskOptions): SpawnManagedBackgroundTaskResult {
		const duplicate = this.findDuplicate(options.dedupeKey);
		if (duplicate) return { status: 'duplicate', existing: duplicate };

		const runningCount = this.getRunningTasks(options.threadId).length;
		if (runningCount >= this.maxConcurrentPerThread) {
			options.onLimitReached?.(
				`Cannot start background task: limit of ${this.maxConcurrentPerThread} concurrent tasks reached. Wait for existing tasks to complete.`,
			);
			return { status: 'limit-reached' };
		}

		const task: ManagedBackgroundTask = {
			taskId: options.taskId,
			threadId: options.threadId,
			runId: options.runId,
			role: options.role,
			agentId: options.agentId,
			status: 'running',
			startedAt: Date.now(),
			abortController: new AbortController(),
			corrections: [],
			messageGroupId: options.messageGroupId,
			plannedTaskId: options.plannedTaskId,
			workItemId: options.workItemId,
			traceContext: options.traceContext,
			dedupeKey: options.dedupeKey,
			parentCheckpointId: options.parentCheckpointId,
		};

		this.tasks.set(options.taskId, task);
		if (options.dedupeKey?.plannedTaskId) {
			this.byPlannedTaskId.set(options.dedupeKey.plannedTaskId, options.taskId);
		} else if (options.dedupeKey?.workflowId) {
			// Only index by (role, workflowId) when there is no plannedTaskId.
			// Otherwise a later spawn for a different planned task targeting the
			// same workflow would be wrongly matched against this one.
			this.byRoleAndWorkflowId.set(
				this.workflowKey(options.dedupeKey.role, options.dedupeKey.workflowId),
				options.taskId,
			);
		}
		void this.executeTask(task, options);
		return { status: 'started', task };
	}

	private releaseDedupeIndices(task: ManagedBackgroundTask): void {
		const key = task.dedupeKey;
		if (!key) return;
		if (key.plannedTaskId) {
			if (this.byPlannedTaskId.get(key.plannedTaskId) === task.taskId) {
				this.byPlannedTaskId.delete(key.plannedTaskId);
			}
			return;
		}
		if (key.workflowId) {
			const wfKey = this.workflowKey(key.role, key.workflowId);
			if (this.byRoleAndWorkflowId.get(wfKey) === task.taskId) {
				this.byRoleAndWorkflowId.delete(wfKey);
			}
		}
	}

	private async executeTask(
		task: ManagedBackgroundTask,
		options: SpawnManagedBackgroundTaskOptions,
	): Promise<void> {
		const drainCorrections = (): string[] => {
			const pending = [...task.corrections];
			task.corrections.length = 0;
			return pending;
		};

		const waitForCorrection = async (): Promise<void> =>
			await new Promise<void>((resolve) => {
				if (task.corrections.length > 0) {
					resolve();
					return;
				}
				task.onCorrectionQueued = resolve;
			});

		try {
			const raw = await options.run(
				task.abortController.signal,
				drainCorrections,
				waitForCorrection,
			);
			task.status = 'completed';
			task.result = typeof raw === 'string' ? raw : raw.text;
			task.outcome = typeof raw === 'string' ? undefined : raw.outcome;
			await options.onCompleted?.(task);
		} catch (error) {
			if (task.abortController.signal.aborted) return;
			task.status = 'failed';
			task.error = error instanceof Error ? error.message : String(error);
			await options.onFailed?.(task);
		} finally {
			try {
				if (!task.abortController.signal.aborted) {
					await options.onSettled?.(task);
				}
			} finally {
				this.tasks.delete(task.taskId);
				this.releaseDedupeIndices(task);
			}
		}
	}
}

export async function enrichMessageWithRunningTasks<
	TTask extends ManagedBackgroundTask = ManagedBackgroundTask,
>(
	message: string,
	runningTasks: TTask[],
	options: BackgroundTaskMessageOptions<TTask> = {},
): Promise<string> {
	if (runningTasks.length === 0) return message;

	const parts: string[] = [];

	for (const task of runningTasks) {
		if (options.formatTask) {
			parts.push(await options.formatTask(task));
			continue;
		}

		parts.push(`[Running task — ${task.role}, task: ${task.taskId}]`);
	}

	return `<running-tasks>\n${parts.join('\n')}\n</running-tasks>\n\n${message}`;
}
