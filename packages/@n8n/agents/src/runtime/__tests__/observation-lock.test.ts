import { InMemoryMemory } from '../memory-store';
import { withObservationLock } from '../observation-lock';

describe('withObservationLock', () => {
	it('runs fn and returns its value when the lock is free', async () => {
		const store = new InMemoryMemory();
		const result = await withObservationLock(
			store,
			'thread',
			't-1',
			{ ttlMs: 60_000 },
			async () => await Promise.resolve(42),
		);
		expect(result).toEqual({ status: 'ran', value: 42 });
	});

	it('skips when another holder is currently holding the lock', async () => {
		const store = new InMemoryMemory();
		await store.acquireObservationLock('thread', 't-1', { ttlMs: 60_000, holderId: 'external' });

		const fn = jest.fn().mockResolvedValue(undefined);
		const result = await withObservationLock(store, 'thread', 't-1', { ttlMs: 60_000 }, fn);

		expect(result).toEqual({ status: 'skipped' });
		expect(fn).not.toHaveBeenCalled();
	});

	it('releases the lock so a subsequent caller can acquire it', async () => {
		const store = new InMemoryMemory();
		await withObservationLock(
			store,
			'thread',
			't-1',
			{ ttlMs: 60_000 },
			async () => await Promise.resolve(),
		);
		const second = await withObservationLock(
			store,
			'thread',
			't-1',
			{ ttlMs: 60_000 },
			async () => await Promise.resolve('after'),
		);
		expect(second).toEqual({ status: 'ran', value: 'after' });
	});

	it('releases the lock even when fn throws', async () => {
		const store = new InMemoryMemory();
		const boom = new Error('boom');
		await expect(
			withObservationLock(store, 'thread', 't-1', { ttlMs: 60_000 }, async () => {
				await Promise.resolve();
				throw boom;
			}),
		).rejects.toBe(boom);

		// Lock should be released — a fresh acquire by a different holder succeeds.
		const followup = await withObservationLock(
			store,
			'thread',
			't-1',
			{ ttlMs: 60_000 },
			async () => await Promise.resolve('post-throw'),
		);
		expect(followup).toEqual({ status: 'ran', value: 'post-throw' });
	});

	it('tolerates the lock having already been released by the time fn returns', async () => {
		const store = new InMemoryMemory();
		const failing = {
			...store,
			releaseObservationLock: jest.fn().mockRejectedValue(new Error('already gone')),
		} as unknown as InMemoryMemory;
		Object.setPrototypeOf(failing, InMemoryMemory.prototype);

		const result = await withObservationLock(
			failing,
			'thread',
			't-1',
			{ ttlMs: 60_000 },
			async () => await Promise.resolve('done'),
		);
		expect(result).toEqual({ status: 'ran', value: 'done' });
	});

	it('passes the granted handle to fn', async () => {
		const store = new InMemoryMemory();
		const result = await withObservationLock(
			store,
			'thread',
			't-1',
			{ ttlMs: 60_000, holderId: 'caller-A' },
			async (handle) => await Promise.resolve(handle.holderId),
		);
		expect(result).toEqual({ status: 'ran', value: 'caller-A' });
	});
});
