import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RuntimeBridge } from '../../types';
import { IsolatePool, PoolDisposedError, PoolExhaustedError } from '../isolate-pool';
import { createMockBridge, createMockObservability } from '../../__tests__/helpers';

function createFactory() {
	return vi.fn().mockImplementation(async () => createMockBridge());
}

async function flushMicrotasks() {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve();
	}
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

	describe('scale-to-0', () => {
		const IDLE_TIMEOUT_MS = 5_000;

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should scale to 0 once after idleTimeoutMs elapses with no acquire', async () => {
			const factory = createFactory();
			const pool = new IsolatePool(factory, 2, IDLE_TIMEOUT_MS);
			await pool.initialize();
			await flushMicrotasks();

			const initialBridges = await Promise.all(
				factory.mock.results.map((r) => r.value as Promise<RuntimeBridge>),
			);
			expect(factory).toHaveBeenCalledTimes(2);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
			await flushMicrotasks();

			for (const bridge of initialBridges) {
				expect(bridge.dispose).toHaveBeenCalled();
			}
			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			await pool.waitForReplenishment();
			await pool.dispose();
		});

		it('should reset the idle timer on each acquire', async () => {
			const factory = createFactory();
			const pool = new IsolatePool(factory, 1, IDLE_TIMEOUT_MS);
			await pool.initialize();
			await flushMicrotasks();

			for (let i = 0; i < 10; i++) {
				vi.advanceTimersByTime(IDLE_TIMEOUT_MS / 2);
				await flushMicrotasks();
				const bridge = pool.acquire();
				await pool.release(bridge);
				await flushMicrotasks();
			}

			expect(factory.mock.calls.length).toBeGreaterThan(1);

			const callsBeforeQuiet = factory.mock.calls.length;
			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
			await flushMicrotasks();

			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			await flushMicrotasks();
			expect(factory.mock.calls.length).toBeGreaterThan(callsBeforeQuiet);
			await pool.dispose();
		});

		it('should refill all the way back up to size after wake-up', async () => {
			const POOL_SIZE = 4;
			const factory = createFactory();
			const pool = new IsolatePool(factory, POOL_SIZE, IDLE_TIMEOUT_MS);
			await pool.initialize();
			await flushMicrotasks();
			expect(factory).toHaveBeenCalledTimes(POOL_SIZE);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
			await flushMicrotasks();

			expect(() => pool.acquire()).toThrow(PoolExhaustedError);

			await flushMicrotasks();
			await pool.waitForReplenishment();
			await flushMicrotasks();

			const acquired: RuntimeBridge[] = [];
			for (let i = 0; i < POOL_SIZE; i++) {
				acquired.push(pool.acquire());
			}
			expect(acquired.length).toBe(POOL_SIZE);
			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			await pool.dispose();
		});

		it('should not replenish on release while idle', async () => {
			const factory = createFactory();
			const pool = new IsolatePool(factory, 2, IDLE_TIMEOUT_MS);
			await pool.initialize();
			await flushMicrotasks();

			const bridge = pool.acquire();
			await flushMicrotasks();

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
			await flushMicrotasks();

			const callsBeforeRelease = factory.mock.calls.length;
			await pool.release(bridge);
			await flushMicrotasks();

			expect(factory.mock.calls.length).toBe(callsBeforeRelease);
			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			await pool.dispose();
		});

		it('should dispose bridges from in-flight replenish after timer fires', async () => {
			let pendingResolvers: Array<(b: RuntimeBridge) => void> = [];
			const slowBridge = createMockBridge();
			const factory = vi.fn().mockImplementation(
				() =>
					new Promise<RuntimeBridge>((resolve) => {
						pendingResolvers.push(resolve);
					}),
			);

			const pool = new IsolatePool(factory, 1, IDLE_TIMEOUT_MS);
			const initPromise = pool.initialize();
			expect(pendingResolvers.length).toBe(1);
			pendingResolvers.shift()!(createMockBridge());
			await initPromise;
			await flushMicrotasks();

			pool.acquire();
			await flushMicrotasks();
			expect(factory).toHaveBeenCalledTimes(2);
			expect(pendingResolvers.length).toBe(1);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

			pendingResolvers.shift()!(slowBridge);
			await flushMicrotasks();
			await pool.waitForReplenishment();
			await flushMicrotasks();

			expect(slowBridge.dispose).toHaveBeenCalled();
			while (pendingResolvers.length > 0) {
				pendingResolvers.shift()!(createMockBridge());
			}
			await pool.dispose();
		});

		it('should abort scale-down if acquire races in during the await', async () => {
			const pendingResolvers: Array<(b: RuntimeBridge) => void> = [];
			const factory = vi.fn().mockImplementation(
				() =>
					new Promise<RuntimeBridge>((resolve) => {
						pendingResolvers.push(resolve);
					}),
			);

			const pool = new IsolatePool(factory, 1, IDLE_TIMEOUT_MS);
			const initPromise = pool.initialize();
			pendingResolvers.shift()!(createMockBridge());
			await initPromise;
			await flushMicrotasks();

			pool.acquire();
			await flushMicrotasks();
			expect(pendingResolvers.length).toBe(1);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

			expect(() => pool.acquire()).toThrow(PoolExhaustedError);

			expect(pendingResolvers.length).toBe(1);

			const replenishBridge = createMockBridge();
			pendingResolvers.shift()!(replenishBridge);
			await flushMicrotasks();
			await pool.waitForReplenishment();
			await flushMicrotasks();

			expect(replenishBridge.dispose).not.toHaveBeenCalled();
			while (pendingResolvers.length > 0) {
				pendingResolvers.shift()!(createMockBridge());
			}
			await pool.dispose();
		});

		it('should clear the idle timer on dispose', async () => {
			const factory = createFactory();
			const pool = new IsolatePool(factory, 1, IDLE_TIMEOUT_MS);
			await pool.initialize();
			await flushMicrotasks();

			await pool.dispose();

			const callsBeforeAdvance = factory.mock.calls.length;
			vi.advanceTimersByTime(IDLE_TIMEOUT_MS * 2);
			await flushMicrotasks();
			expect(factory.mock.calls.length).toBe(callsBeforeAdvance);
		});

		it('should keep pool warm under bursty short-acquire pattern (webhook hot path)', async () => {
			const factory = createFactory();
			const pool = new IsolatePool(factory, 2, IDLE_TIMEOUT_MS);
			await pool.initialize();
			await flushMicrotasks();

			const interval = IDLE_TIMEOUT_MS / 10;
			for (let i = 0; i < 20; i++) {
				vi.advanceTimersByTime(interval);
				await flushMicrotasks();
				const bridge = pool.acquire();
				await pool.release(bridge);
				await flushMicrotasks();
				await pool.waitForReplenishment();
				await flushMicrotasks();
			}

			const drained: RuntimeBridge[] = [];
			drained.push(pool.acquire());
			drained.push(pool.acquire());
			expect(drained.length).toBe(2);
			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			await pool.dispose();
		});

		it('should preserve current behavior when idleTimeoutMs is unset', async () => {
			const factory = createFactory();
			const pool = new IsolatePool(factory, 2);
			await pool.initialize();
			await flushMicrotasks();

			const initialBridges = await Promise.all(
				factory.mock.results.map((r) => r.value as Promise<RuntimeBridge>),
			);

			vi.advanceTimersByTime(60 * 60 * 1000);
			await flushMicrotasks();

			for (const bridge of initialBridges) {
				expect(bridge.dispose).not.toHaveBeenCalled();
			}
			await pool.dispose();
		});

		it('should emit observability metrics on scale-down and scale-up', async () => {
			const factory = createFactory();
			const observability = createMockObservability();
			const pool = new IsolatePool(
				factory,
				1,
				IDLE_TIMEOUT_MS,
				undefined,
				undefined,
				observability,
			);
			await pool.initialize();
			await flushMicrotasks();

			expect(observability.metrics.gauge).toHaveBeenCalledWith('expression.pool.size', 1);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
			await flushMicrotasks();

			expect(observability.metrics.counter).toHaveBeenCalledWith(
				'expression.pool.scaled_to_zero',
				1,
			);

			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			expect(observability.metrics.counter).toHaveBeenCalledWith('expression.pool.scaled_up', 1);
			await pool.dispose();
		});

		it('should emit scaled_to_zero exactly once when two scaleToZero calls overlap', async () => {
			const pendingResolvers: Array<(b: RuntimeBridge) => void> = [];
			const factory = vi.fn().mockImplementation(
				() =>
					new Promise<RuntimeBridge>((resolve) => {
						pendingResolvers.push(resolve);
					}),
			);
			const observability = createMockObservability();
			const pool = new IsolatePool(
				factory,
				1,
				IDLE_TIMEOUT_MS,
				undefined,
				undefined,
				observability,
			);
			const initPromise = pool.initialize();
			pendingResolvers.shift()!(createMockBridge());
			await initPromise;
			await flushMicrotasks();

			pool.acquire();
			await flushMicrotasks();
			expect(pendingResolvers.length).toBe(1);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

			expect(() => pool.acquire()).toThrow(PoolExhaustedError);
			expect(pendingResolvers.length).toBe(1);

			vi.advanceTimersByTime(IDLE_TIMEOUT_MS);

			const replenishBridge = createMockBridge();
			pendingResolvers.shift()!(replenishBridge);
			await flushMicrotasks();
			await pool.waitForReplenishment();
			await flushMicrotasks();

			const scaledToZeroCalls = vi
				.mocked(observability.metrics.counter)
				.mock.calls.filter((call) => call[0] === 'expression.pool.scaled_to_zero');
			expect(scaledToZeroCalls.length).toBe(1);

			while (pendingResolvers.length > 0) {
				pendingResolvers.shift()!(createMockBridge());
			}
			await pool.dispose();
		});
	});
});
