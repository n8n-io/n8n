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

			expect(result.status).toBe('started');
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

			expect(result.status).toBe('limit-reached');
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

	describe('single-flight dedupe', () => {
		it('returns duplicate when plannedTaskId matches a running task', () => {
			const first = manager.spawn(
				makeSpawnOptions({
					taskId: 'first',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-1' },
				}),
			);
			expect(first.status).toBe('started');

			const run = jest.fn(async (): Promise<string> => await new Promise(() => {}));
			const second = manager.spawn(
				makeSpawnOptions({
					taskId: 'second',
					run,
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-1' },
				}),
			);

			expect(second.status).toBe('duplicate');
			if (second.status === 'duplicate') {
				expect(second.existing.taskId).toBe('first');
			}
			expect(run).not.toHaveBeenCalled();
			expect(manager.getRunningTasks('thread-1')).toHaveLength(1);
		});

		it('allows a new spawn once the first planned-task settles', async () => {
			const { promise, resolve } = createDeferred<string>();
			manager.spawn(
				makeSpawnOptions({
					taskId: 'first',
					run: async () => await promise,
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-2' },
				}),
			);

			resolve('done');
			await flushPromises();

			const second = manager.spawn(
				makeSpawnOptions({
					taskId: 'second',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-2' },
				}),
			);
			expect(second.status).toBe('started');
		});

		it('returns duplicate when workflowId + role matches a running task without plannedTaskId', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 'first',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'workflow-builder', workflowId: 'wf-1' },
				}),
			);

			const run = jest.fn(async (): Promise<string> => await new Promise(() => {}));
			const second = manager.spawn(
				makeSpawnOptions({
					taskId: 'second',
					run,
					dedupeKey: { role: 'workflow-builder', workflowId: 'wf-1' },
				}),
			);

			expect(second.status).toBe('duplicate');
			expect(run).not.toHaveBeenCalled();
		});

		it('does not collapse two distinct plannedTaskIds that target the same workflowId', () => {
			// A planner may emit two work items for the same workflow — e.g., initial
			// build (planned-A) followed by a patch (planned-B). They are distinct
			// planned tasks and must both run; collapsing them on workflowId would
			// skip work the user approved.
			const first = manager.spawn(
				makeSpawnOptions({
					taskId: 'task-A',
					run: async () => await new Promise(() => {}),
					dedupeKey: {
						role: 'workflow-builder',
						plannedTaskId: 'planned-A',
						workflowId: 'wf-shared',
					},
				}),
			);
			expect(first.status).toBe('started');

			const run = jest.fn(async (): Promise<string> => await new Promise(() => {}));
			const second = manager.spawn(
				makeSpawnOptions({
					taskId: 'task-B',
					run,
					dedupeKey: {
						role: 'workflow-builder',
						plannedTaskId: 'planned-B',
						workflowId: 'wf-shared',
					},
				}),
			);

			expect(second.status).toBe('started');
			expect(run).toHaveBeenCalledTimes(1);
			expect(manager.getRunningTasks('thread-1')).toHaveLength(2);
		});

		it('does not dedupe across roles for the same workflowId', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 'builder',
					role: 'workflow-builder',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'workflow-builder', workflowId: 'wf-1' },
				}),
			);

			const other = manager.spawn(
				makeSpawnOptions({
					taskId: 'researcher',
					role: 'web-researcher',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'web-researcher', workflowId: 'wf-1' },
				}),
			);

			expect(other.status).toBe('started');
			expect(manager.getRunningTasks('thread-1')).toHaveLength(2);
		});

		it('limit-reached still fires even when dedupe would have passed', () => {
			const filler = makeSpawnOptions({ run: async () => await new Promise(() => {}) });
			manager.spawn({ ...filler, taskId: 't1' });
			manager.spawn({ ...filler, taskId: 't2' });
			manager.spawn({ ...filler, taskId: 't3' });

			const onLimitReached = jest.fn();
			const result = manager.spawn(
				makeSpawnOptions({
					taskId: 't4',
					onLimitReached,
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-fresh' },
				}),
			);
			expect(result.status).toBe('limit-reached');
			expect(onLimitReached).toHaveBeenCalled();
		});

		it('cancelTask releases dedupe indices so a fresh spawn is allowed', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 'first',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-3' },
				}),
			);
			manager.cancelTask('thread-1', 'first');

			const second = manager.spawn(
				makeSpawnOptions({
					taskId: 'second',
					run: async () => await new Promise(() => {}),
					dedupeKey: { role: 'workflow-builder', plannedTaskId: 'planned-3' },
				}),
			);
			expect(second.status).toBe('started');
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

	describe('getRunningTasksByParentCheckpoint', () => {
		it('returns running tasks tagged with the given checkpoint id', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 'child-1',
					run: async () => await new Promise(() => {}),
					parentCheckpointId: 'cp-verify-1',
				}),
			);
			manager.spawn(
				makeSpawnOptions({
					taskId: 'child-2',
					run: async () => await new Promise(() => {}),
					parentCheckpointId: 'cp-verify-1',
				}),
			);
			manager.spawn(
				makeSpawnOptions({
					taskId: 'unrelated',
					run: async () => await new Promise(() => {}),
				}),
			);

			const children = manager.getRunningTasksByParentCheckpoint('thread-1', 'cp-verify-1');
			expect(children.map((c) => c.taskId).sort()).toEqual(['child-1', 'child-2']);
		});

		it('excludes tasks tagged under a different checkpoint', () => {
			manager.spawn(
				makeSpawnOptions({
					taskId: 'child-a',
					run: async () => await new Promise(() => {}),
					parentCheckpointId: 'cp-A',
				}),
			);
			manager.spawn(
				makeSpawnOptions({
					taskId: 'child-b',
					run: async () => await new Promise(() => {}),
					parentCheckpointId: 'cp-B',
				}),
			);

			const childrenA = manager.getRunningTasksByParentCheckpoint('thread-1', 'cp-A');
			expect(childrenA.map((c) => c.taskId)).toEqual(['child-a']);
		});

		it('excludes tasks that have already settled', async () => {
			const { promise, resolve } = createDeferred<string>();
			manager.spawn(
				makeSpawnOptions({
					taskId: 'child-done',
					parentCheckpointId: 'cp-verify-1',
					run: async () => await promise,
				}),
			);

			resolve('done');
			await flushPromises();

			expect(manager.getRunningTasksByParentCheckpoint('thread-1', 'cp-verify-1')).toHaveLength(0);
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
