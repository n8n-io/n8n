import type { BackgroundTaskResult, InstanceAiTraceContext } from '../types';
import type {
	InstanceAiLivenessDecision,
	InstanceAiLivenessPolicy,
	InstanceAiLivenessTimeoutReason,
} from './liveness-policy';

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
	lastActivityAt: number;
	timeoutReason?: InstanceAiLivenessTimeoutReason;
	abortController: AbortController;
	corrections: string[];
	/** Callback resolved when a new correction is queued. Re-created by the consumer after each notification. */
	onCorrectionQueued?: () => void;
	messageGroupId?: string;
	outcome?: Record<string, unknown>;
	workItemId?: string;
	traceContext?: InstanceAiTraceContext;
	createTraceContext?: () => Promise<InstanceAiTraceContext | undefined>;
	/** Identity used for single-flight dedupe lookups; copied from the spawn options. */
	dedupeKey?: BackgroundTaskDedupeKey;
}

export interface BackgroundTaskDedupeKey {
	/** Target workflow ID for this background task. */
	workflowId?: string;
	/** Agent role (e.g. 'workflow-builder'). Scopes the workflowId key so different roles against the same workflow don't collide. */
	role: string;
}

export interface SpawnManagedBackgroundTaskOptions {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	messageGroupId?: string;
	workItemId?: string;
	traceContext?: InstanceAiTraceContext;
	createTraceContext?: () => Promise<InstanceAiTraceContext | undefined>;
	/**
	 * Identity for single-flight dedupe. When supplied, a spawn with the same
	 * `role + workflowId` as a currently-running task returns
	 * `{ status: 'duplicate', existing }` instead of launching a second task.
	 */
	dedupeKey?: BackgroundTaskDedupeKey;
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
		waitForCorrection: () => Promise<void>,
		taskContext: { traceContext?: InstanceAiTraceContext },
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

export interface BackgroundTaskTimeoutOptions {
	shouldSkipTask?: (task: ManagedBackgroundTask) => boolean;
}

export interface BackgroundTaskMessageOptions<
	TTask extends ManagedBackgroundTask = ManagedBackgroundTask,
> {
	formatTask?: (task: TTask) => Promise<string> | string;
}

export class BackgroundTaskManager {
	private readonly tasks = new Map<string, ManagedBackgroundTask>();
	private readonly callbacks = new Map<
		string,
		Pick<SpawnManagedBackgroundTaskOptions, 'onCompleted' | 'onFailed' | 'onSettled'>
	>();
	/** `${role}:${workflowId}` → taskId for the currently-running task. */
	private readonly byRoleAndWorkflowId = new Map<string, string>();

	constructor(
		private readonly maxConcurrentPerThread = 5,
		/**
		 * Ceiling on sub-agents running across every thread on this process. Guards the
		 * fan-out the per-thread limit misses: a handful of runs each spawning their full
		 * complement. `-1` means unlimited, matching the execution concurrency limits.
		 */
		private readonly maxConcurrentTotal = -1,
	) {}

	private workflowKey(role: string, workflowId: string): string {
		return `${role}:${workflowId}`;
	}

	private findDuplicate(
		dedupeKey: BackgroundTaskDedupeKey | undefined,
	): ManagedBackgroundTask | undefined {
		if (!dedupeKey) return undefined;
		if (dedupeKey.workflowId) {
			const existingId = this.byRoleAndWorkflowId.get(
				this.workflowKey(dedupeKey.role, dedupeKey.workflowId),
			);
			if (existingId) {
				const existing = this.tasks.get(existingId);
				if (existing?.status === 'running') return existing;
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

	/** Sub-agents running across every thread on this process. */
	runningTaskCount(): number {
		let count = 0;
		for (const task of this.tasks.values()) {
			if (task.status === 'running') count++;
		}
		return count;
	}

	queueCorrection(
		threadId: string,
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		const task = this.tasks.get(taskId);
		if (task?.threadId !== threadId) return 'task-not-found';
		if (task.status !== 'running') return 'task-completed';
		this.touchTask(threadId, taskId);
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
		if (task?.threadId !== threadId || task.status !== 'running') return undefined;

		task.abortController.abort();
		task.status = 'cancelled';
		this.tasks.delete(taskId);
		this.releaseDedupeIndices(task);
		this.callbacks.delete(taskId);
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
			this.callbacks.delete(taskId);
		}
		return cancelled;
	}

	cancelAll(): ManagedBackgroundTask[] {
		const cancelled: ManagedBackgroundTask[] = [];
		for (const [taskId, task] of this.tasks) {
			task.abortController.abort();
			task.status = 'cancelled';
			cancelled.push(task);
			this.tasks.delete(taskId);
			this.releaseDedupeIndices(task);
			this.callbacks.delete(taskId);
		}
		return cancelled;
	}

	touchTask(threadId: string, taskId: string, at = Date.now()): boolean {
		const task = this.tasks.get(taskId);
		if (task?.threadId !== threadId || task.status !== 'running') return false;
		task.lastActivityAt = at;
		return true;
	}

	async timeoutTimedOutTasks(
		policy: InstanceAiLivenessPolicy,
		now = Date.now(),
		options: BackgroundTaskTimeoutOptions = {},
	): Promise<ManagedBackgroundTask[]> {
		const timedOut: ManagedBackgroundTask[] = [];
		for (const task of [...this.tasks.values()]) {
			if (task.status !== 'running') continue;
			if (options.shouldSkipTask?.(task)) continue;
			const decision = policy.evaluate({
				surface: 'background-task',
				startedAt: task.startedAt,
				lastActivityAt: task.lastActivityAt,
				now,
			});
			if (decision.action !== 'timeout') continue;
			await this.timeoutTask(task, decision);
			timedOut.push(task);
		}
		return timedOut;
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

		if (this.maxConcurrentTotal !== -1 && this.runningTaskCount() >= this.maxConcurrentTotal) {
			options.onLimitReached?.(
				`Cannot start background task: this n8n instance is at its limit of ${this.maxConcurrentTotal} concurrent tasks. Wait for existing tasks to complete.`,
			);
			return { status: 'limit-reached' };
		}

		const now = Date.now();
		const task: ManagedBackgroundTask = {
			taskId: options.taskId,
			threadId: options.threadId,
			runId: options.runId,
			role: options.role,
			agentId: options.agentId,
			status: 'running',
			startedAt: now,
			lastActivityAt: now,
			abortController: new AbortController(),
			corrections: [],
			messageGroupId: options.messageGroupId,
			workItemId: options.workItemId,
			traceContext: options.traceContext,
			dedupeKey: options.dedupeKey,
		};

		this.tasks.set(options.taskId, task);
		this.callbacks.set(options.taskId, {
			onCompleted: options.onCompleted,
			onFailed: options.onFailed,
			onSettled: options.onSettled,
		});
		if (options.dedupeKey?.workflowId) {
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
			if (!task.traceContext && options.createTraceContext) {
				task.traceContext = await options.createTraceContext();
			}
			const raw = await options.run(
				task.abortController.signal,
				drainCorrections,
				waitForCorrection,
				{ traceContext: task.traceContext },
			);
			if (task.status !== 'running') return;
			task.status = 'completed';
			task.result = typeof raw === 'string' ? raw : raw.text;
			task.outcome = typeof raw === 'string' ? undefined : raw.outcome;
			await options.onCompleted?.(task);
		} catch (error) {
			if (task.status !== 'running') return;
			if (task.abortController.signal.aborted) return;
			task.status = 'failed';
			task.error = error instanceof Error ? error.message : String(error);
			await options.onFailed?.(task);
		} finally {
			try {
				if (!task.abortController.signal.aborted && task.status !== 'running') {
					await options.onSettled?.(task);
				}
			} finally {
				if (task.status !== 'running') {
					this.tasks.delete(task.taskId);
					this.releaseDedupeIndices(task);
					this.callbacks.delete(task.taskId);
				}
			}
		}
	}

	private async timeoutTask(
		task: ManagedBackgroundTask,
		decision: Extract<InstanceAiLivenessDecision, { action: 'timeout' }>,
	): Promise<void> {
		if (task.status !== 'running') return;

		task.abortController.abort();
		task.status = 'failed';
		task.timeoutReason = decision.reason;
		task.error = `Background ${task.role} task timed out after ${decision.timeoutMs}ms`;

		const callbacks = this.callbacks.get(task.taskId);
		try {
			await callbacks?.onFailed?.(task);
		} finally {
			try {
				await callbacks?.onSettled?.(task);
			} finally {
				this.tasks.delete(task.taskId);
				this.releaseDedupeIndices(task);
				this.callbacks.delete(task.taskId);
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
