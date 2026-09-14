import type ivm from 'isolated-vm';

import {
	AppIsolatePool,
	AppIsolateSlot,
	PoolDisposedError,
	PoolExhaustedError,
} from '../app-isolate-pool';

// No mocking — uses the real isolated-vm V8 isolate, same as
// `agent-secure-runtime.test.ts` for the agents runtime this was adapted from.

let ivmModule: typeof ivm;

beforeAll(async () => {
	ivmModule = (await import('isolated-vm')).default;
});

function disableReplenish(pool: AppIsolatePool): void {
	(pool as unknown as { replenish: () => void }).replenish = () => {};
}

function makePool(options?: ConstructorParameters<typeof AppIsolatePool>[1]) {
	return new AppIsolatePool(ivmModule, options);
}

describe('AppIsolatePool', () => {
	it('initialize() creates N slots', async () => {
		const pool = makePool({ size: 2 });
		disableReplenish(pool);
		await pool.initialize();

		const s1 = await pool.acquire();
		const s2 = await pool.acquire();
		expect(s1).toBeInstanceOf(AppIsolateSlot);
		expect(s2).toBeInstanceOf(AppIsolateSlot);

		pool.release(s1);
		pool.release(s2);
		await pool.dispose();
	});

	it('acquire() blocks when the pool is empty and resolves after a release', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire();
		const waiter = pool.acquire();
		pool.release(slot);

		await expect(waiter).resolves.toBe(slot);
		pool.release(slot);
		await pool.dispose();
	});

	it('acquire() rejects with PoolExhaustedError once the wait queue is full', async () => {
		const pool = makePool({ size: 1, maxQueueDepth: 0 });
		disableReplenish(pool);
		await pool.initialize();

		await pool.acquire(); // exhaust the only slot

		await expect(pool.acquire()).rejects.toBeInstanceOf(PoolExhaustedError);
		await pool.dispose();
	});

	it('release() discards an unhealthy (disposed) slot instead of returning it to the pool', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();

		const slot = await pool.acquire();
		slot.isolate.dispose(); // simulate an OOM'd isolate
		pool.release(slot);

		// The pool is empty (no replenishment): acquiring queues rather than returning the dead slot.
		const waiter = pool.acquire();
		let settled = false;
		void waiter.then(
			() => {
				settled = true;
			},
			() => {},
		);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(settled).toBe(false);

		await pool.dispose();
		await expect(waiter).rejects.toBeInstanceOf(PoolDisposedError);
	});

	it('acquire() after dispose() throws PoolDisposedError', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();
		await pool.dispose();

		await expect(pool.acquire()).rejects.toBeInstanceOf(PoolDisposedError);
	});

	it('dispose() rejects pending waiters with PoolDisposedError', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();
		await pool.acquire(); // exhaust

		const waiter = pool.acquire();
		await pool.dispose();

		await expect(waiter).rejects.toBeInstanceOf(PoolDisposedError);
	});

	it('a fresh context has no require/import — referencing them throws', async () => {
		const pool = makePool({ size: 1 });
		disableReplenish(pool);
		await pool.initialize();
		const slot = await pool.acquire();

		const context = slot.createContext();
		try {
			expect(() => context.evalSync('require', { timeout: 1000 })).toThrow();
		} finally {
			context.release();
			pool.release(slot);
			await pool.dispose();
		}
	});
});
