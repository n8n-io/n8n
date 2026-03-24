import type { BackgroundTaskResult } from '../types';

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
	messageGroupId?: string;
	outcome?: Record<string, unknown>;
	workItemId?: string;
}

export interface SpawnManagedBackgroundTaskOptions {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	messageGroupId?: string;
	workItemId?: string;
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
	) => Promise<string | BackgroundTaskResult>;
	onLimitReached?: (errorMessage: string) => void;
	onCompleted?: (task: ManagedBackgroundTask) => void | Promise<void>;
	onFailed?: (task: ManagedBackgroundTask) => void | Promise<void>;
	onSettled?: (task: ManagedBackgroundTask) => void | Promise<void>;
}

export interface BackgroundTaskMessageOptions<
	TTask extends ManagedBackgroundTask = ManagedBackgroundTask,
> {
	formatTask?: (task: TTask) => Promise<string> | string;
}

export class BackgroundTaskManager {
	private readonly tasks = new Map<string, ManagedBackgroundTask>();

	constructor(private readonly maxConcurrentPerThread = 5) {}

	getTaskSnapshots(threadId: string): ManagedBackgroundTask[] {
		return [...this.tasks.values()].filter((task) => task.threadId === threadId);
	}

	getRunningTasks(threadId: string): ManagedBackgroundTask[] {
		return [...this.tasks.values()].filter(
			(task) => task.threadId === threadId && task.status === 'running',
		);
	}

	queueCorrection(taskId: string, correction: string): void {
		const task = this.tasks.get(taskId);
		if (!task || task.status !== 'running') return;
		task.corrections.push(correction);
	}

	cancelTask(threadId: string, taskId: string): ManagedBackgroundTask | undefined {
		const task = this.tasks.get(taskId);
		if (!task || task.threadId !== threadId || task.status !== 'running') return undefined;

		task.abortController.abort();
		task.status = 'cancelled';
		this.tasks.delete(taskId);
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
		}
		return cancelled;
	}

	cancelAll(): ManagedBackgroundTask[] {
		const cancelled: ManagedBackgroundTask[] = [];
		for (const [taskId, task] of this.tasks) {
			task.abortController.abort();
			cancelled.push(task);
			this.tasks.delete(taskId);
		}
		return cancelled;
	}

	spawn(options: SpawnManagedBackgroundTaskOptions): boolean {
		const runningCount = this.getRunningTasks(options.threadId).length;
		if (runningCount >= this.maxConcurrentPerThread) {
			options.onLimitReached?.(
				`Cannot start background task: limit of ${this.maxConcurrentPerThread} concurrent tasks reached. Wait for existing tasks to complete.`,
			);
			return false;
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
			workItemId: options.workItemId,
		};

		this.tasks.set(options.taskId, task);
		void this.executeTask(task, options);
		return true;
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

		try {
			const raw = await options.run(task.abortController.signal, drainCorrections);
			task.status = 'completed';
			task.result = typeof raw === 'string' ? raw : raw.text;
			task.outcome = typeof raw === 'string' ? undefined : raw.outcome;
			await options.onCompleted?.(task);
		} catch (error) {
			if (task.abortController.signal.aborted) return;
			task.status = 'failed';
			task.error = error instanceof Error ? error.message : String(error);
			await options.onFailed?.(task);
		}

		await options.onSettled?.(task);
		this.tasks.delete(task.taskId);
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
