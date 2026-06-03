import { BackgroundTaskTracker } from './background-task-tracker';
import type {
	BuiltObservationLogTaskLockStore,
	ObservationLogTaskKind,
	ObservationLogTaskLockHandle,
} from '../types/sdk/observation-log';

const DEFAULT_LOCK_TTL_MS = 30_000;
const DEFAULT_MAX_CAPTURED_ERRORS = 50;

export interface ScopedMemoryTaskDescriptor {
	taskKind: ObservationLogTaskKind;
	observationScopeId: string;
}

export type ScopedMemoryTaskStatus = 'queued' | 'running';

export interface ScopedMemoryTaskInfo extends ScopedMemoryTaskDescriptor {
	id: string;
	status: ScopedMemoryTaskStatus;
	queuedAt: Date;
	startedAt?: Date;
}

export type ScopedMemoryTaskResult<T> =
	| { status: 'completed'; value: T }
	| { status: 'skipped'; reason: 'lock-held' }
	| { status: 'failed'; error: unknown };

export interface ScopedMemoryTaskHandle<T> extends ScopedMemoryTaskDescriptor {
	id: string;
	done: Promise<ScopedMemoryTaskResult<T>>;
}

export interface ScopedMemoryTaskError extends ScopedMemoryTaskDescriptor {
	id: string;
	error: unknown;
	createdAt: Date;
}

export type ScopedMemoryTaskEvent<T = unknown> =
	| { type: 'started'; task: ScopedMemoryTaskInfo }
	| { type: 'completed'; task: ScopedMemoryTaskInfo; value: T }
	| { type: 'skipped'; task: ScopedMemoryTaskInfo; reason: 'lock-held' }
	| { type: 'failed'; task: ScopedMemoryTaskInfo; error: unknown };

export interface ScopedMemoryTaskRunnerOptions {
	tracker?: BackgroundTaskTracker;
	lockStore?: BuiltObservationLogTaskLockStore;
	lockTtlMs?: number;
	maxCapturedErrors?: number;
	onEvent?: (event: ScopedMemoryTaskEvent) => void;
}

export class ScopedMemoryTaskRunner {
	private readonly tracker: BackgroundTaskTracker;

	private readonly lockStore: BuiltObservationLogTaskLockStore | undefined;

	private readonly lockTtlMs: number;

	private readonly maxCapturedErrors: number;

	private readonly onEvent: ((event: ScopedMemoryTaskEvent) => void) | undefined;

	private readonly queuesByScope = new Map<string, Promise<unknown>>();

	private readonly inFlightTasks = new Map<string, ScopedMemoryTaskInfo>();

	private readonly capturedErrors: ScopedMemoryTaskError[] = [];

	constructor(options: ScopedMemoryTaskRunnerOptions = {}) {
		this.tracker = options.tracker ?? new BackgroundTaskTracker();
		this.lockStore = options.lockStore;
		this.lockTtlMs = options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
		const maxCapturedErrors = Math.floor(options.maxCapturedErrors ?? DEFAULT_MAX_CAPTURED_ERRORS);
		this.maxCapturedErrors = Number.isFinite(maxCapturedErrors)
			? Math.max(0, maxCapturedErrors)
			: 0;
		this.onEvent = options.onEvent;
	}

	get pendingCount(): number {
		return this.inFlightTasks.size;
	}

	getInFlightTasks(): ScopedMemoryTaskInfo[] {
		return Array.from(this.inFlightTasks.values()).map((task) => ({
			...task,
			queuedAt: new Date(task.queuedAt),
			...(task.startedAt ? { startedAt: new Date(task.startedAt) } : {}),
		}));
	}

	getCapturedErrors(): ScopedMemoryTaskError[] {
		return this.capturedErrors.map((entry) => ({
			...entry,
			createdAt: new Date(entry.createdAt),
		}));
	}

	async flush(): Promise<void> {
		await this.tracker.flush();
	}

	schedule<T>(
		descriptor: ScopedMemoryTaskDescriptor,
		task: () => Promise<T>,
	): ScopedMemoryTaskHandle<T> {
		const id = crypto.randomUUID();
		const info: ScopedMemoryTaskInfo = {
			...descriptor,
			id,
			status: 'queued',
			queuedAt: new Date(),
		};
		this.inFlightTasks.set(id, info);

		const scopeKey = descriptor.observationScopeId;
		const previous = this.queuesByScope.get(scopeKey) ?? Promise.resolve();
		const done = previous.catch(() => undefined).then(async () => await this.runTask(info, task));
		const queued = done.finally(() => {
			if (this.queuesByScope.get(scopeKey) === queued) {
				this.queuesByScope.delete(scopeKey);
			}
		});
		this.queuesByScope.set(scopeKey, queued);
		this.tracker.track(queued);

		return { ...descriptor, id, done };
	}

	private async runTask<T>(
		info: ScopedMemoryTaskInfo,
		task: () => Promise<T>,
	): Promise<ScopedMemoryTaskResult<T>> {
		info.status = 'running';
		info.startedAt = new Date();
		this.emit({ type: 'started', task: this.cloneTaskInfo(info) });

		let lock: ObservationLogTaskLockHandle | null = null;
		try {
			lock = await this.acquireLock(info);
			if (this.lockStore && !lock) {
				const result: ScopedMemoryTaskResult<T> = { status: 'skipped', reason: 'lock-held' };
				this.emit({ type: 'skipped', task: this.cloneTaskInfo(info), reason: 'lock-held' });
				return result;
			}

			const value = await task();
			this.emit({ type: 'completed', task: this.cloneTaskInfo(info), value });
			return { status: 'completed', value };
		} catch (error) {
			this.captureError(info, error);
			this.emit({ type: 'failed', task: this.cloneTaskInfo(info), error });
			return { status: 'failed', error };
		} finally {
			if (lock) await this.releaseLock(info, lock);
			this.inFlightTasks.delete(info.id);
		}
	}

	private async acquireLock(
		info: ScopedMemoryTaskInfo,
	): Promise<ObservationLogTaskLockHandle | null> {
		if (!this.lockStore) return null;
		return await this.lockStore.acquireObservationLogTaskLock(
			info.observationScopeId,
			info.taskKind,
			{ holderId: info.id, ttlMs: this.lockTtlMs },
		);
	}

	private async releaseLock(
		info: ScopedMemoryTaskInfo,
		lock: ObservationLogTaskLockHandle,
	): Promise<void> {
		try {
			await this.lockStore?.releaseObservationLogTaskLock(lock);
		} catch (error) {
			this.captureError(info, error);
		}
	}

	private captureError(info: ScopedMemoryTaskInfo, error: unknown): void {
		this.capturedErrors.push({
			id: info.id,
			taskKind: info.taskKind,
			observationScopeId: info.observationScopeId,
			error,
			createdAt: new Date(),
		});
		while (this.capturedErrors.length > this.maxCapturedErrors) {
			this.capturedErrors.shift();
		}
	}

	private emit(event: ScopedMemoryTaskEvent): void {
		try {
			this.onEvent?.(event);
		} catch (error) {
			this.captureError(event.task, error);
		}
	}

	private cloneTaskInfo(info: ScopedMemoryTaskInfo): ScopedMemoryTaskInfo {
		return {
			...info,
			queuedAt: new Date(info.queuedAt),
			...(info.startedAt ? { startedAt: new Date(info.startedAt) } : {}),
		};
	}
}
