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
		const bridge = pool.acquireImmediately();
		expect(bridge).toBeDefined();
		expect(bridge!.execute).toBeDefined();
		await pool.dispose();
	});

	it('should return undefined from acquireImmediately when exhausted', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();
		expect(pool.acquireImmediately()).toBeDefined();
		expect(pool.acquireImmediately()).toBeUndefined();
		await pool.dispose();
	});

	it('should wait and resolve when a bridge becomes available', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 1000);
		await pool.initialize();

		const bridge = pool.acquireImmediately()!;
		const acquirePromise = pool.acquireOrWait();

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

		const bridge = pool.acquireImmediately()!;
		const acquirePromise = pool.acquireOrWait();

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

		pool.acquireImmediately();

		await expect(pool.acquireOrWait()).rejects.toThrow('Timed out waiting for isolate');
		await pool.dispose();
	});

	it('should return a bridge without disposing', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		const bridge = pool.acquireImmediately()!;
		pool.returnToPool(bridge);
		expect(bridge.dispose).not.toHaveBeenCalled();

		const same = pool.acquireImmediately();
		expect(same).toBe(bridge);
		await pool.dispose();
	});

	it('should dispose bridge on release and replenish', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		const bridge = pool.acquireImmediately()!;
		await pool.release(bridge);
		expect(bridge.dispose).toHaveBeenCalled();

		await new Promise((resolve) => setTimeout(resolve, 50));

		const newBridge = pool.acquireImmediately();
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

		pool.acquireImmediately();
		const acquirePromise = pool.acquireOrWait();

		await pool.dispose();
		await expect(acquirePromise).rejects.toThrow('Pool is being disposed');
	});

	it('should throw on acquireImmediately after disposal', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();
		await pool.dispose();
		expect(() => pool.acquireImmediately()).toThrow('Pool is disposed');
	});

	it('should replenish when a disposed bridge is returned to pool', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1, 5000);
		await pool.initialize();

		const bridge = pool.acquireImmediately()!;
		(bridge.isDisposed as ReturnType<typeof vi.fn>).mockReturnValue(true);

		pool.returnToPool(bridge);

		// Wait for async replenishment
		await new Promise((resolve) => setTimeout(resolve, 50));

		const newBridge = pool.acquireImmediately();
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
		expect(pool.acquireImmediately()).toBeDefined();
		expect(pool.acquireImmediately()).toBeDefined();
		expect(pool.acquireImmediately()).toBeUndefined();
		await pool.dispose();
	});

	it('should throw if all bridges fail during initialization', async () => {
		const factory = vi.fn().mockRejectedValue(new Error('fail'));
		const pool = new IsolatePool(factory, 3, 5000);
		await expect(pool.initialize()).rejects.toThrow('IsolatePool failed to create any bridges');
	});
});
