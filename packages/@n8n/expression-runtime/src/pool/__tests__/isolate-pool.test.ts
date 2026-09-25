import { describe, it, expect, vi } from 'vitest';
import type { RuntimeBridge } from '../../types';
import { IsolatePool, PoolDisposedError, PoolExhaustedError } from '../isolate-pool';
import { createMockBridge } from '../../__tests__/helpers';

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

	it('should retry replenishment without leaking a rejection when setTimeout returns a number', async () => {
		const nodeSetTimeout = globalThis.setTimeout;
		const wait = async (ms: number) => await new Promise((resolve) => nodeSetTimeout(resolve, ms));
		vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
			handler: () => void,
			ms?: number,
		): number => {
			nodeSetTimeout(handler, ms);
			return 1;
		}) as unknown as typeof globalThis.setTimeout);

		const leaked: unknown[] = [];
		const onUnhandled = (reason: unknown) => leaked.push(reason);
		process.on('unhandledRejection', onUnhandled);

		let attempts = 0;
		const factory = vi.fn().mockImplementation(async () => {
			attempts++;
			if (attempts === 1) return createMockBridge();
			throw new Error('fail');
		});

		const pool = new IsolatePool(factory, 1);
		await pool.initialize();

		try {
			pool.acquire();

			const deadline = Date.now() + 3000;
			while (attempts < 3 && Date.now() < deadline) await wait(50);
			await wait(50);

			expect(attempts).toBeGreaterThanOrEqual(3);
			expect(leaked).toEqual([]);
		} finally {
			process.off('unhandledRejection', onUnhandled);
			vi.mocked(globalThis.setTimeout).mockRestore();
			await pool.dispose();
		}
	});
});
