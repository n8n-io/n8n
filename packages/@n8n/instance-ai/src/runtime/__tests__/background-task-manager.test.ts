import type { BackgroundTaskResult } from '../../types';
import { BackgroundTaskManager, enrichMessageWithRunningTasks } from '../background-task-manager';
import type {
	ManagedBackgroundTask,
	SpawnManagedBackgroundTaskOptions,
} from '../background-task-manager';

function makeSpawnOptions(
	overrides: Partial<SpawnManagedBackgroundTaskOptions> = {},
): SpawnManagedBackgroundTaskOptions {
	return {
		taskId: 'task-1',
		threadId: 'thread-1',
		runId: 'run-1',
		role: 'builder',
		agentId: 'agent-1',
		run: jest.fn().mockResolvedValue('done'),
		...overrides,
	};
}

describe('BackgroundTaskManager', () => {
	let manager: BackgroundTaskManager;

	beforeEach(() => {
		manager = new BackgroundTaskManager(3);
	});

	describe('spawn', () => {
		it('spawns a task and tracks it as running', () => {
			const result = manager.spawn(makeSpawnOptions());

			expect(result).toBe(true);
			expect(manager.getRunningTasks('thread-1')).toHaveLength(1);
			expect(manager.getRunningTasks('thread-1')[0].taskId).toBe('task-1');
		});

		it('rejects spawn when concurrent limit is reached', () => {
			const onLimitReached = jest.fn();

			manager.spawn(
				makeSpawnOptions({ taskId: 't1', run: async () => await new Promise(() => {}) }),
			);
			manager.spawn(
				makeSpawnOptions({ taskId: 't2', run: async () => await new Promise(() => {}) }),
			);
			manager.spawn(
				makeSpawnOptions({ taskId: 't3', run: async () => await new Promise(() => {}) }),
			);

			const result = manager.spawn(makeSpawnOptions({ taskId: 't4', onLimitReached }));

			expect(result).toBe(false);
			expect(onLimitReached).toHaveBeenCalledWith(expect.stringContaining('limit of 3'));
		});

		it('calls onCompleted and onSettled when run resolves with string', async () => {
			const onCompleted = jest.fn();
			const onSettled = jest.fn();
			const { promise, resolve } = createDeferred<string>();

			manager.spawn(
				makeSpawnOptions({
					run: async () => await promise,
					onCompleted,
					onSettled,
				}),
			);

			resolve('result-text');
			await flushPromises();

			expect(onCompleted).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'completed', result: 'result-text' }),
			);
			expect(onSettled).toHaveBeenCalled();
		});

		it('calls onCompleted with structured result', async () => {
			const onCompleted = jest.fn();
			const { promise, resolve } = createDeferred<string | BackgroundTaskResult>();

			manager.spawn(
				makeSpawnOptions({
					run: async () => await promise,
					onCompleted,
				}),
			);

			resolve({ text: 'summary', outcome: { workflowId: 'wf-1' } });
			await flushPromises();

			expect(onCompleted).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'completed',
					result: 'summary',
					outcome: { workflowId: 'wf-1' },
				}),
			);
		});

		it('calls onFailed and onSettled when run rejects', async () => {
			const onFailed = jest.fn();
			const onSettled = jest.fn();
			const { promise, reject } = createDeferred<string | BackgroundTaskResult>();

			manager.spawn(
				makeSpawnOptions({
					run: async () => await promise,
					onFailed,
					onSettled,
				}),
			);

			reject(new Error('boom'));
			await flushPromises();

			expect(onFailed).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'failed', error: 'boom' }),
			);
			expect(onSettled).toHaveBeenCalled();
		});

		it('does not call onFailed when aborted', async () => {
			const onFailed = jest.fn();
			const { promise, reject } = createDeferred<string | BackgroundTaskResult>();

			manager.spawn(
				makeSpawnOptions({
					run: async () => await promise,
					onFailed,
				}),
			);

			manager.cancelTask('thread-1', 'task-1');
			reject(new Error('aborted'));
			await flushPromises();

			expect(onFailed).not.toHaveBeenCalled();
		});

		it('does not call onSettled when aborted', async () => {
			const onSettled = jest.fn();
			const { promise, reject } = createDeferred<string | BackgroundTaskResult>();

			manager.spawn(
				makeSpawnOptions({
					run: async () => await promise,
					onSettled,
				}),
			);

			manager.cancelTask('thread-1', 'task-1');
			reject(new Error('aborted'));
			await flushPromises();

			expect(onSettled).not.toHaveBeenCalled();
		});

		it('removes task from map after settlement', async () => {
			const { promise, resolve } = createDeferred<string>();

			manager.spawn(makeSpawnOptions({ run: async () => await promise }));
			expect(manager.getTaskSnapshots('thread-1')).toHaveLength(1);

			resolve('done');
			await flushPromises();

			expect(manager.getTaskSnapshots('thread-1')).toHaveLength(0);
		});
	});

	describe('queueCorrection', () => {
		it('queues correction for running task', () => {
			manager.spawn(makeSpawnOptions({ run: async () => await new Promise(() => {}) }));

			expect(manager.queueCorrection('thread-1', 'task-1', 'fix this')).toBe('queued');
		});

		it('returns task-not-found for unknown task', () => {
			expect(manager.queueCorrection('thread-1', 'unknown', 'fix')).toBe('task-not-found');
		});

		it('returns task-not-found for wrong thread', () => {
			manager.spawn(makeSpawnOptions({ run: async () => await new Promise(() => {}) }));

			expect(manager.queueCorrection('thread-2', 'task-1', 'fix')).toBe('task-not-found');
		});

		it('drains corrections during run execution', async () => {
			const drainedCorrections: string[][] = [];
			const { promise, resolve } = createDeferred<string>();

			manager.spawn(
				makeSpawnOptions({
					run: async (_signal, drain) => {
						drainedCorrections.push(drain());
						return await promise;
					},
				}),
			);

			// Queue correction before the run resolves
			await flushPromises();
			manager.queueCorrection('thread-1', 'task-1', 'correction-1');

			resolve('done');
			await flushPromises();

			expect(drainedCorrections[0]).toEqual([]);
		});

		it('notifies waitForCorrection when a correction is queued', async () => {
			let waitForCorrection: (() => Promise<void>) | undefined;
			const { promise, resolve } = createDeferred<string>();

			manager.spawn(
				makeSpawnOptions({
					run: async (_signal, _drain, waitFn) => {
						waitForCorrection = waitFn;
						return await promise;
					},
				}),
			);

			await flushPromises();

			const correctionPromise = waitForCorrection!();
			let resolved = false;
			void correctionPromise.then(() => {
				resolved = true;
			});

			await flushPromises();
			expect(resolved).toBe(false);

			manager.queueCorrection('thread-1', 'task-1', 'use openrouter node');
			await flushPromises();

			expect(resolved).toBe(true);

			resolve('done');
			await flushPromises();
		});

		it('resolves waitForCorrection immediately when corrections are already queued', async () => {
			let waitForCorrection: (() => Promise<void>) | undefined;
			const { promise, resolve } = createDeferred<string>();

			manager.spawn(
				makeSpawnOptions({
					run: async (_signal, _drain, waitFn) => {
						waitForCorrection = waitFn;
						return await promise;
					},
				}),
			);

			await flushPromises();

			manager.queueCorrection('thread-1', 'task-1', 'pending correction');
			const correctionPromise = waitForCorrection!();
			let resolved = false;
			void correctionPromise.then(() => {
				resolved = true;
			});

			await flushPromises();
			expect(resolved).toBe(true);

			resolve('done');
			await flushPromises();
		});
	});

	describe('cancelTask', () => {
		it('cancels a running task and aborts its signal', () => {
			manager.spawn(makeSpawnOptions({ run: async () => await new Promise(() => {}) }));

			const cancelled = manager.cancelTask('thread-1', 'task-1');

			expect(cancelled).toBeDefined();
			expect(cancelled!.status).toBe('cancelled');
			expect(cancelled!.abortController.signal.aborted).toBe(true);
			expect(manager.getRunningTasks('thread-1')).toHaveLength(0);
		});

		it('returns undefined for non-existent task', () => {
			expect(manager.cancelTask('thread-1', 'unknown')).toBeUndefined();
		});

		it('returns undefined for wrong thread', () => {
			manager.spawn(makeSpawnOptions({ run: async () => await new Promise(() => {}) }));

			expect(manager.cancelTask('thread-2', 'task-1')).toBeUndefined();
		});
	});

	describe('cancelThread', () => {
		it('cancels all running tasks for a thread', () => {
			manager.spawn(
				makeSpawnOptions({ taskId: 't1', run: async () => await new Promise(() => {}) }),
			);
			manager.spawn(
				makeSpawnOptions({ taskId: 't2', run: async () => await new Promise(() => {}) }),
			);

			const cancelled = manager.cancelThread('thread-1');

			expect(cancelled).toHaveLength(2);
			expect(manager.getRunningTasks('thread-1')).toHaveLength(0);
		});

		it('does not cancel tasks for other threads', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 't1',
					threadId: 'thread-1',
					run: async () => await new Promise(() => {}),
				}),
			);
			manager.spawn(
				makeSpawnOptions({
					taskId: 't2',
					threadId: 'thread-2',
					run: async () => await new Promise(() => {}),
				}),
			);

			manager.cancelThread('thread-1');

			expect(manager.getRunningTasks('thread-2')).toHaveLength(1);
		});
	});

	describe('cancelAll', () => {
		it('cancels all tasks across all threads', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 't1',
					threadId: 'thread-1',
					run: async () => await new Promise(() => {}),
				}),
			);
			manager.spawn(
				makeSpawnOptions({
					taskId: 't2',
					threadId: 'thread-2',
					run: async () => await new Promise(() => {}),
				}),
			);

			const cancelled = manager.cancelAll();

			expect(cancelled).toHaveLength(2);
			expect(manager.getRunningTasks('thread-1')).toHaveLength(0);
			expect(manager.getRunningTasks('thread-2')).toHaveLength(0);
		});
	});

	describe('getTaskSnapshots / getRunningTasks', () => {
		it('returns empty array for unknown thread', () => {
			expect(manager.getTaskSnapshots('unknown')).toEqual([]);
			expect(manager.getRunningTasks('unknown')).toEqual([]);
		});

		it('getRunningTasks excludes non-running tasks', async () => {
			const { promise, resolve } = createDeferred<string>();
			manager.spawn(makeSpawnOptions({ run: async () => await promise }));

			resolve('done');
			await flushPromises();

			expect(manager.getRunningTasks('thread-1')).toHaveLength(0);
		});
	});
});

describe('enrichMessageWithRunningTasks', () => {
	it('returns original message when no tasks', async () => {
		const result = await enrichMessageWithRunningTasks('Hello', []);
		expect(result).toBe('Hello');
	});

	it('prepends running-tasks block with default format', async () => {
		const tasks = [{ taskId: 'task-1', role: 'builder' } as ManagedBackgroundTask];

		const result = await enrichMessageWithRunningTasks('Hello', tasks);

		expect(result).toContain('<running-tasks>');
		expect(result).toContain('builder');
		expect(result).toContain('task-1');
		expect(result).toContain('Hello');
	});

	it('uses custom formatTask when provided', async () => {
		const tasks = [{ taskId: 'task-1', role: 'builder' } as ManagedBackgroundTask];

		const result = await enrichMessageWithRunningTasks('Hello', tasks, {
			formatTask: (t) => `Custom: ${t.role}`,
		});

		expect(result).toContain('Custom: builder');
	});
});

// --- Helpers ---

async function flushPromises(): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

function createDeferred<T = unknown>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
