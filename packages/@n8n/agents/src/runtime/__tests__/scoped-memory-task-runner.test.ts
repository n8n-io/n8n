import type {
	BuiltObservationLogTaskLockStore,
	ObservationLogTaskKind,
	ObservationLogTaskLockHandle,
} from '../../types/sdk/observation-log';
import { ScopedMemoryTaskRunner } from '../memory/scoped-memory-task-runner';

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function deferredValue<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function lockStore(
	acquire: BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock'],
): BuiltObservationLogTaskLockStore {
	return {
		acquireObservationLogTaskLock: acquire,
		releaseObservationLogTaskLock: vi.fn().mockResolvedValue(undefined),
	};
}

function lockHandle(
	observationScopeId: string,
	taskKind: ObservationLogTaskKind,
	holderId: string,
): ObservationLogTaskLockHandle {
	return {
		observationScopeId,
		taskKind,
		holderId,
		heldUntil: new Date(Date.now() + 30_000),
	};
}

describe('ScopedMemoryTaskRunner', () => {
	it('serializes observer and reflector tasks for the same scope', async () => {
		const runner = new ScopedMemoryTaskRunner();
		const first = deferred();
		const events: string[] = [];

		const observer = runner.schedule(
			{ taskKind: 'observer', observationScopeId: 'thread-1' },
			async () => {
				events.push('observer:start');
				await first.promise;
				events.push('observer:end');
			},
		);
		const reflector = runner.schedule(
			{ taskKind: 'reflector', observationScopeId: 'thread-1' },
			async () => {
				events.push('reflector:start');
				await Promise.resolve();
			},
		);

		await Promise.resolve();
		await Promise.resolve();
		expect(runner.getInFlightTasks()).toMatchObject([
			{ taskKind: 'observer', status: 'running' },
			{ taskKind: 'reflector', status: 'queued' },
		]);

		first.resolve();
		await expect(observer.done).resolves.toMatchObject({ status: 'completed' });
		await expect(reflector.done).resolves.toMatchObject({ status: 'completed' });
		expect(events).toEqual(['observer:start', 'observer:end', 'reflector:start']);
	});

	it('skips a task when the store lock is already held', async () => {
		const acquire = vi.fn().mockResolvedValue(null);
		const runner = new ScopedMemoryTaskRunner({ lockStore: lockStore(acquire) });
		const task = vi.fn().mockResolvedValue(undefined);

		const handle = runner.schedule({ taskKind: 'observer', observationScopeId: 'thread-1' }, task);

		await expect(handle.done).resolves.toMatchObject({
			status: 'skipped',
			reason: 'lock-held',
		});
		expect(task).not.toHaveBeenCalled();
		expect(runner.getInFlightTasks()).toEqual([]);
	});

	it('captures task failures without rejecting the background handle', async () => {
		const error = new Error('observer failed');
		const seenEvents: string[] = [];
		const runner = new ScopedMemoryTaskRunner({
			onEvent: (event) => seenEvents.push(event.type),
		});

		const handle = runner.schedule(
			{ taskKind: 'observer', observationScopeId: 'thread-1' },
			async () => {
				await Promise.reject(error);
			},
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'failed', error });
		await expect(runner.flush()).resolves.toBeUndefined();
		expect(runner.getCapturedErrors()).toMatchObject([{ error }]);
		expect(seenEvents).toEqual(['queued', 'started', 'failed']);
	});

	it('treats negative maxCapturedErrors as zero', async () => {
		const runner = new ScopedMemoryTaskRunner({ maxCapturedErrors: -1 });

		const handle = runner.schedule(
			{ taskKind: 'observer', observationScopeId: 'thread-1' },
			async () => {
				await Promise.reject(new Error('observer failed'));
			},
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'failed' });
		expect(runner.getCapturedErrors()).toEqual([]);
	});

	it('treats NaN maxCapturedErrors as zero', async () => {
		const runner = new ScopedMemoryTaskRunner({ maxCapturedErrors: Number.NaN });

		const handle = runner.schedule(
			{ taskKind: 'observer', observationScopeId: 'thread-1' },
			async () => {
				await Promise.reject(new Error('observer failed'));
			},
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'failed' });
		expect(runner.getCapturedErrors()).toEqual([]);
	});

	it('captures onEvent failures without failing the task lifecycle', async () => {
		const eventError = new Error('event sink failed');
		const task = vi.fn(async () => await Promise.resolve('done'));
		const runner = new ScopedMemoryTaskRunner({
			onEvent: () => {
				throw eventError;
			},
		});

		const handle = runner.schedule({ taskKind: 'reflector', observationScopeId: 'thread-1' }, task);

		await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
		expect(task).toHaveBeenCalled();
		expect(runner.getInFlightTasks()).toEqual([]);
		expect(runner.getCapturedErrors()).toEqual(
			expect.arrayContaining([expect.objectContaining({ error: eventError })]),
		);
	});

	it('removes settled scope queue entries after completion', async () => {
		const runner = new ScopedMemoryTaskRunner();

		const handle = runner.schedule(
			{ taskKind: 'observer', observationScopeId: 'thread-1' },
			async () => await Promise.resolve('done'),
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
		await runner.flush();

		expect(Reflect.get(runner, 'queuesByScope')).toHaveProperty('size', 0);
	});

	it('acquires and releases a store lock around the task', async () => {
		const acquire = vi.fn<
			(
				...args: Parameters<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
			) => ReturnType<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
		>(
			async (observationScopeId, taskKind, opts) =>
				await Promise.resolve(lockHandle(observationScopeId, taskKind, opts.holderId)),
		);
		const store = lockStore(acquire);
		const runner = new ScopedMemoryTaskRunner({ lockStore: store, lockTtlMs: 15_000 });

		const handle = runner.schedule(
			{ taskKind: 'reflector', observationScopeId: 'user-1' },
			async () => await Promise.resolve('done'),
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
		expect(acquire).toHaveBeenCalledWith('user-1', 'reflector', {
			holderId: handle.id,
			ttlMs: 15_000,
		});
		expect(store.releaseObservationLogTaskLock).toHaveBeenCalledWith(
			expect.objectContaining({ taskKind: 'reflector', holderId: handle.id }),
		);
	});

	it('renews an acquired lock while the task is running and stops before release', async () => {
		vi.useFakeTimers();
		try {
			const acquire = vi.fn<
				(
					...args: Parameters<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
				) => ReturnType<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
			>(
				async (observationScopeId, taskKind, opts) =>
					await Promise.resolve(lockHandle(observationScopeId, taskKind, opts.holderId)),
			);
			const store = lockStore(acquire);
			const runner = new ScopedMemoryTaskRunner({ lockStore: store, lockTtlMs: 10_000 });
			const first = deferred();

			const handle = runner.schedule(
				{ taskKind: 'observer', observationScopeId: 'user-1' },
				async () => {
					await first.promise;
					return 'done';
				},
			);

			await vi.advanceTimersByTimeAsync(0);
			expect(acquire).toHaveBeenCalledTimes(1);

			// Half the TTL: exactly one renewal, reusing the same scope/kind/holder/TTL.
			await vi.advanceTimersByTimeAsync(5_000);
			expect(acquire).toHaveBeenCalledTimes(2);
			expect(acquire).toHaveBeenNthCalledWith(2, 'user-1', 'observer', {
				holderId: handle.id,
				ttlMs: 10_000,
			});

			first.resolve();
			await vi.advanceTimersByTimeAsync(0);
			await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
			expect(store.releaseObservationLogTaskLock).toHaveBeenCalledTimes(1);

			// No further renewal after the task settled and the lock was released.
			await vi.advanceTimersByTimeAsync(20_000);
			expect(acquire).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('stops lock renewal when a task fails', async () => {
		vi.useFakeTimers();
		try {
			const acquire = vi.fn<
				(
					...args: Parameters<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
				) => ReturnType<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
			>(
				async (observationScopeId, taskKind, opts) =>
					await Promise.resolve(lockHandle(observationScopeId, taskKind, opts.holderId)),
			);
			const store = lockStore(acquire);
			const runner = new ScopedMemoryTaskRunner({ lockStore: store, lockTtlMs: 10_000 });
			const first = deferred();
			const error = new Error('observer failed');

			const handle = runner.schedule(
				{ taskKind: 'observer', observationScopeId: 'user-1' },
				async () => {
					await first.promise;
					throw error;
				},
			);

			await vi.advanceTimersByTimeAsync(0);
			expect(acquire).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5_000);
			expect(acquire).toHaveBeenCalledTimes(2);

			first.resolve();
			await vi.advanceTimersByTimeAsync(0);
			await expect(handle.done).resolves.toMatchObject({ status: 'failed', error });
			expect(store.releaseObservationLogTaskLock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(20_000);
			expect(acquire).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not wait for a stalled in-flight renewal before completing the task', async () => {
		vi.useFakeTimers();
		try {
			// Only the first task's renewal call (the 2nd overall acquire call)
			// never settles, simulating a lock-store request that hangs (e.g. a
			// stuck DB query). The first task's initial acquire and the second
			// task's own acquire must both resolve normally.
			const stalledRenewal = new Promise<ObservationLogTaskLockHandle | null>(() => {});
			let callCount = 0;
			const acquire = vi.fn<
				(
					...args: Parameters<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
				) => ReturnType<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
			>(async (observationScopeId, taskKind, opts) => {
				callCount++;
				if (callCount === 2) {
					return await stalledRenewal;
				}
				return await Promise.resolve(lockHandle(observationScopeId, taskKind, opts.holderId));
			});
			const store = lockStore(acquire);
			const runner = new ScopedMemoryTaskRunner({ lockStore: store, lockTtlMs: 10_000 });
			const first = deferred();

			const handle = runner.schedule(
				{ taskKind: 'observer', observationScopeId: 'user-1' },
				async () => {
					await first.promise;
					return 'done';
				},
			);

			await vi.advanceTimersByTimeAsync(0);
			expect(acquire).toHaveBeenCalledTimes(1);

			// Half the TTL: the renewal starts but stalls forever.
			await vi.advanceTimersByTimeAsync(5_000);
			expect(acquire).toHaveBeenCalledTimes(2);

			first.resolve();
			await vi.advanceTimersByTimeAsync(0);

			// The task settles, and its own lock releases, without waiting for the
			// stalled renewal.
			await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
			expect(store.releaseObservationLogTaskLock).toHaveBeenCalledTimes(1);

			// The scope queue advances: a second task for the same scope can start
			// even though the first task's renewal call is still stalled.
			const second = runner.schedule(
				{ taskKind: 'reflector', observationScopeId: 'user-1' },
				async () => await Promise.resolve('second-done'),
			);
			await vi.advanceTimersByTimeAsync(0);
			await expect(second.done).resolves.toMatchObject({
				status: 'completed',
				value: 'second-done',
			});
		} finally {
			vi.useRealTimers();
		}
	});

	it('releases a renewal handle that arrives after the task stopped', async () => {
		vi.useFakeTimers();
		try {
			const renewalCall = deferredValue<ObservationLogTaskLockHandle | null>();
			let callCount = 0;
			const acquire = vi.fn<
				(
					...args: Parameters<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
				) => ReturnType<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
			>(async (observationScopeId, taskKind, opts) => {
				callCount++;
				if (callCount === 1) {
					return await Promise.resolve(lockHandle(observationScopeId, taskKind, opts.holderId));
				}
				return await renewalCall.promise;
			});
			const store = lockStore(acquire);
			const runner = new ScopedMemoryTaskRunner({ lockStore: store, lockTtlMs: 10_000 });
			const first = deferred();

			const handle = runner.schedule(
				{ taskKind: 'observer', observationScopeId: 'user-1' },
				async () => {
					await first.promise;
					return 'done';
				},
			);

			await vi.advanceTimersByTimeAsync(0);
			expect(acquire).toHaveBeenCalledTimes(1);

			// Half the TTL: the renewal starts but stays pending (deferred).
			await vi.advanceTimersByTimeAsync(5_000);
			expect(acquire).toHaveBeenCalledTimes(2);

			first.resolve();
			await vi.advanceTimersByTimeAsync(0);
			await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });

			// The task's own lock releases even though the renewal is still pending.
			expect(store.releaseObservationLogTaskLock).toHaveBeenCalledTimes(1);
			expect(store.releaseObservationLogTaskLock).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ holderId: handle.id }),
			);

			// The pending renewal now resolves with a late handle — it must be
			// released too, and no further renewal should be scheduled for it.
			renewalCall.resolve(lockHandle('user-1', 'observer', handle.id));
			await vi.advanceTimersByTimeAsync(0);

			expect(store.releaseObservationLogTaskLock).toHaveBeenCalledTimes(2);
			expect(store.releaseObservationLogTaskLock).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ holderId: handle.id }),
			);

			await vi.advanceTimersByTimeAsync(20_000);
			expect(acquire).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});
});
