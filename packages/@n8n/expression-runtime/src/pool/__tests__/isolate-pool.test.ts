import { describe, it, expect, vi } from 'vitest';
import type { RuntimeBridge } from '../../types';
import { IsolatePool } from '../isolate-pool';

function createMockBridge(): RuntimeBridge {
	return {
		initialize: vi.fn().mockResolvedValue(undefined),
		execute: vi.fn().mockReturnValue('result'),
		dispose: vi.fn().mockResolvedValue(undefined),
		isDisposed: vi.fn().mockReturnValue(false),
	};
}

function createFactory() {
	return vi.fn().mockImplementation(async () => createMockBridge());
}

describe('IsolatePool', () => {
	it('should initialize with the configured number of bridges', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 3, 5000);
		await pool.initialize();
		expect(factory).toHaveBeenCalledTimes(3);
		await pool.dispose();
	});

	it('should acquire a bridge synchronously', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 2, 5000);
		await pool.initialize();
		const bridge = pool.tryAcquire();
		expect(bridge).toBeDefined();
		expect(bridge!.execute).toBeDefined();
		await pool.dispose();
	});

	it('should return undefined from tryAcquire when exhausted', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();
		expect(pool.tryAcquire()).toBeDefined();
		expect(pool.tryAcquire()).toBeUndefined();
		await pool.dispose();
	});

	it('should wait and resolve when a bridge becomes available', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 1000);
		await pool.initialize();

		const bridge = pool.tryAcquire()!;
		const acquirePromise = pool.acquire();

		// Return the bridge — should resolve the waiter
		pool.returnToPool(bridge);

		const acquired = await acquirePromise;
		expect(acquired).toBe(bridge);
		await pool.dispose();
	});

	it('should resolve waiter when replenishment completes', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 1000);
		await pool.initialize();

		const bridge = pool.tryAcquire()!;
		const acquirePromise = pool.acquire();

		// Release (dispose + replenish) — new bridge should go to waiter
		await pool.release(bridge);

		const acquired = await acquirePromise;
		expect(acquired).toBeDefined();
		expect(acquired).not.toBe(bridge);
		await pool.dispose();
	});

	it('should timeout when no bridge becomes available', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 50);
		await pool.initialize();

		pool.tryAcquire();

		await expect(pool.acquire()).rejects.toThrow('Timed out waiting for isolate');
		await pool.dispose();
	});

	it('should return a bridge without disposing', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		const bridge = pool.tryAcquire()!;
		pool.returnToPool(bridge);
		expect(bridge.dispose).not.toHaveBeenCalled();

		const same = pool.tryAcquire();
		expect(same).toBe(bridge);
		await pool.dispose();
	});

	it('should dispose bridge on release and replenish', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		const bridge = pool.tryAcquire()!;
		await pool.release(bridge);
		expect(bridge.dispose).toHaveBeenCalled();

		await new Promise((resolve) => setTimeout(resolve, 50));

		const newBridge = pool.tryAcquire();
		expect(newBridge).toBeDefined();
		expect(newBridge).not.toBe(bridge);
		await pool.dispose();
	});

	it('should dispose all bridges on pool disposal', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 3, 5000);
		await pool.initialize();
		await pool.dispose();
		const bridges = await Promise.all(
			factory.mock.results.map((r) => r.value as Promise<RuntimeBridge>),
		);
		for (const bridge of bridges) {
			expect(bridge.dispose).toHaveBeenCalled();
		}
	});

	it('should reject waiters on disposal', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		pool.tryAcquire();
		const acquirePromise = pool.acquire();

		await pool.dispose();
		await expect(acquirePromise).rejects.toThrow('Pool is being disposed');
	});

	it('should throw on tryAcquire after disposal', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();
		await pool.dispose();
		expect(() => pool.tryAcquire()).toThrow('Pool is disposed');
	});

	it('should replenish when a disposed bridge is returned to pool', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		const bridge = pool.tryAcquire()!;
		(bridge.isDisposed as ReturnType<typeof vi.fn>).mockReturnValue(true);

		pool.returnToPool(bridge);

		// Wait for async replenishment
		await new Promise((resolve) => setTimeout(resolve, 50));

		const newBridge = pool.tryAcquire();
		expect(newBridge).toBeDefined();
		expect(newBridge).not.toBe(bridge);
		await pool.dispose();
	});

	it('should handle partial failure during initialization', async () => {
		let callCount = 0;
		const factory = vi.fn().mockImplementation(async () => {
			callCount++;
			if (callCount === 2) throw new Error('Failed to create bridge');
			return createMockBridge();
		});

		const pool = new IsolatePool(factory, 3, 5000);
		await pool.initialize();

		// 2 of 3 succeeded
		expect(pool.tryAcquire()).toBeDefined();
		expect(pool.tryAcquire()).toBeDefined();
		expect(pool.tryAcquire()).toBeUndefined();
		await pool.dispose();
	});

	it('should throw if all bridges fail during initialization', async () => {
		const factory = vi.fn().mockRejectedValue(new Error('fail'));
		const pool = new IsolatePool(factory, 3, 5000);
		await expect(pool.initialize()).rejects.toThrow('IsolatePool failed to create any bridges');
	});
});
