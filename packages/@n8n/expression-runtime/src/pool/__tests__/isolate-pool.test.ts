import { describe, it, expect, vi } from 'vitest';
import type { RuntimeBridge } from '../../types';
import { IsolatePool, PoolDisposedError, PoolExhaustedError } from '../isolate-pool';

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
		const pool = new IsolatePool(factory, 3);
		await pool.initialize();
		expect(factory).toHaveBeenCalledTimes(3);
		await pool.dispose();
	});

	it('should acquire a bridge synchronously', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 2);
		await pool.initialize();
		const bridge = pool.acquire();
		expect(bridge).toBeDefined();
		expect(bridge.execute).toBeDefined();
		await pool.dispose();
	});

	it('should throw when pool is exhausted', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1);
		await pool.initialize();
		pool.acquire();
		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await pool.dispose();
	});

	it('should dispose and replace bridge on release', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1);
		await pool.initialize();

		const bridge = pool.acquire();
		await pool.release(bridge);
		expect(bridge.dispose).toHaveBeenCalled();

		await new Promise((resolve) => setTimeout(resolve, 50));

		const newBridge = pool.acquire();
		expect(newBridge).toBeDefined();
		expect(newBridge).not.toBe(bridge);
		await pool.dispose();
	});

	it('should dispose all bridges on pool disposal', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 3);
		await pool.initialize();
		await pool.dispose();
		const bridges = await Promise.all(
			factory.mock.results.map((r) => r.value as Promise<RuntimeBridge>),
		);
		expect(factory).toHaveBeenCalledTimes(3);
		for (const bridge of bridges) {
			expect(bridge.dispose).toHaveBeenCalled();
		}
	});

	it('should throw on acquire after disposal', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1);
		await pool.initialize();
		await pool.dispose();
		expect(() => pool.acquire()).toThrow(PoolDisposedError);
	});

	it('should handle partial failure during initialization', async () => {
		let callCount = 0;
		const factory = vi.fn().mockImplementation(async () => {
			callCount++;
			if (callCount === 2) throw new Error('Failed to create bridge');
			return createMockBridge();
		});

		const pool = new IsolatePool(factory, 3);
		await pool.initialize();

		// 2 of 3 succeeded
		expect(pool.acquire()).toBeDefined();
		expect(pool.acquire()).toBeDefined();
		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await pool.dispose();
	});

	it('should throw if all bridges fail during initialization', async () => {
		const factory = vi.fn().mockRejectedValue(new Error('fail'));
		const pool = new IsolatePool(factory, 3);
		await expect(pool.initialize()).rejects.toThrow('IsolatePool failed to create any bridges');
	});

	it('should kick off replenishment after acquire', async () => {
		const factory = createFactory();
		const pool = new IsolatePool(factory, 1);
		await pool.initialize();

		pool.acquire();

		// Wait for async replenishment
		await new Promise((resolve) => setTimeout(resolve, 50));

		const replenished = pool.acquire();
		expect(replenished).toBeDefined();
		await pool.dispose();
	});
});
