import type {
	BuiltObservationLogTaskLockStore,
	ObservationLogTaskKind,
	ObservationLogTaskLockHandle,
	ObservationLogScopeKind,
} from '../../types/sdk/observation-log';
import { ScopedMemoryTaskRunner } from '../scoped-memory-task-runner';

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function lockStore(
	acquire: BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock'],
): BuiltObservationLogTaskLockStore {
	return {
		acquireObservationLogTaskLock: acquire,
		releaseObservationLogTaskLock: jest.fn().mockResolvedValue(undefined),
	};
}

function lockHandle(
	scopeKind: ObservationLogScopeKind,
	scopeId: string,
	taskKind: ObservationLogTaskKind,
	holderId: string,
): ObservationLogTaskLockHandle {
	return {
		scopeKind,
		scopeId,
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
			{ taskKind: 'observer', scopeKind: 'thread', scopeId: 'thread-1' },
			async () => {
				events.push('observer:start');
				await first.promise;
				events.push('observer:end');
			},
		);
		const reflector = runner.schedule(
			{ taskKind: 'reflector', scopeKind: 'thread', scopeId: 'thread-1' },
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
		const acquire = jest.fn().mockResolvedValue(null);
		const runner = new ScopedMemoryTaskRunner({ lockStore: lockStore(acquire) });
		const task = jest.fn().mockResolvedValue(undefined);

		const handle = runner.schedule(
			{ taskKind: 'observer', scopeKind: 'thread', scopeId: 'thread-1' },
			task,
		);

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
			{ taskKind: 'observer', scopeKind: 'thread', scopeId: 'thread-1' },
			async () => {
				await Promise.reject(error);
			},
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'failed', error });
		await expect(runner.flush()).resolves.toBeUndefined();
		expect(runner.getCapturedErrors()).toMatchObject([{ error }]);
		expect(seenEvents).toEqual(['started', 'failed']);
	});

	it('treats negative maxCapturedErrors as zero', async () => {
		const runner = new ScopedMemoryTaskRunner({ maxCapturedErrors: -1 });

		const handle = runner.schedule(
			{ taskKind: 'observer', scopeKind: 'thread', scopeId: 'thread-1' },
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
			{ taskKind: 'observer', scopeKind: 'thread', scopeId: 'thread-1' },
			async () => {
				await Promise.reject(new Error('observer failed'));
			},
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'failed' });
		expect(runner.getCapturedErrors()).toEqual([]);
	});

	it('captures onEvent failures without failing the task lifecycle', async () => {
		const eventError = new Error('event sink failed');
		const task = jest.fn(async () => await Promise.resolve('done'));
		const runner = new ScopedMemoryTaskRunner({
			onEvent: () => {
				throw eventError;
			},
		});

		const handle = runner.schedule(
			{ taskKind: 'reflector', scopeKind: 'thread', scopeId: 'thread-1' },
			task,
		);

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
			{ taskKind: 'observer', scopeKind: 'thread', scopeId: 'thread-1' },
			async () => await Promise.resolve('done'),
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
		await runner.flush();

		expect(Reflect.get(runner, 'queuesByScope')).toHaveProperty('size', 0);
	});

	it('acquires and releases a store lock around the task', async () => {
		const acquire = jest.fn<
			ReturnType<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>,
			Parameters<BuiltObservationLogTaskLockStore['acquireObservationLogTaskLock']>
		>(
			async (scopeKind, scopeId, taskKind, opts) =>
				await Promise.resolve(lockHandle(scopeKind, scopeId, taskKind, opts.holderId)),
		);
		const store = lockStore(acquire);
		const runner = new ScopedMemoryTaskRunner({ lockStore: store, lockTtlMs: 15_000 });

		const handle = runner.schedule(
			{ taskKind: 'reflector', scopeKind: 'resource', scopeId: 'user-1' },
			async () => await Promise.resolve('done'),
		);

		await expect(handle.done).resolves.toMatchObject({ status: 'completed', value: 'done' });
		expect(acquire).toHaveBeenCalledWith('resource', 'user-1', 'reflector', {
			holderId: handle.id,
			ttlMs: 15_000,
		});
		expect(store.releaseObservationLogTaskLock).toHaveBeenCalledWith(
			expect.objectContaining({ taskKind: 'reflector', holderId: handle.id }),
		);
	});
});
