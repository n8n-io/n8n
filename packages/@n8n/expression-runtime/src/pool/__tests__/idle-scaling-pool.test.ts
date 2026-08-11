import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RuntimeBridge } from '../../types';
import { IdleScalingPool } from '../idle-scaling-pool';
import { PoolDisposedError, PoolExhaustedError } from '../isolate-pool';
import {
	createDeferredBridgeFactory,
	createMockBridge,
	createMockObservability,
	flushMicrotasks,
} from '../../__tests__/helpers';

const IDLE_TIMEOUT_MS = 5_000;

function createFactory() {
	return vi.fn().mockImplementation(async () => createMockBridge());
}

describe('IdleScalingPool', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize with the configured number of bridges', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 3, IDLE_TIMEOUT_MS);
		await pool.initialize();
		expect(factory).toHaveBeenCalledTimes(3);
		await pool.dispose();
	});

	it('should throw PoolDisposedError on acquire after dispose', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await pool.dispose();
		expect(() => pool.acquire()).toThrow(PoolDisposedError);
	});

	it('should scale to 0 after idleTimeoutMs elapses with no acquire', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 2, IDLE_TIMEOUT_MS);
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

	it('should trigger scale-up on acquire after scale-down and warm back to full size', async () => {
		const POOL_SIZE = 4;
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, POOL_SIZE, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();
		expect(factory).toHaveBeenCalledTimes(POOL_SIZE);

		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
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

	it('should not trigger a duplicate scale-up on a second acquire while scaling up', async () => {
		const { factory, pendingResolvers } = createDeferredBridgeFactory();
		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		const initPromise = pool.initialize();
		pendingResolvers.shift()!(createMockBridge());
		await initPromise;
		await flushMicrotasks();

		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await flushMicrotasks();
		const callsAfterFirstAcquire = factory.mock.calls.length;

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await flushMicrotasks();
		expect(factory.mock.calls.length).toBe(callsAfterFirstAcquire);

		while (pendingResolvers.length > 0) {
			pendingResolvers.shift()!(createMockBridge());
		}
		await pool.dispose();
	});

	it('should reset the idle timer on each acquire', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();

		for (let i = 0; i < 10; i++) {
			vi.advanceTimersByTime(IDLE_TIMEOUT_MS / 2);
			await flushMicrotasks();
			const bridge = pool.acquire();
			await pool.release(bridge);
			await flushMicrotasks();
			await pool.waitForReplenishment();
		}

		const callsBeforeQuiet = factory.mock.calls.length;
		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await flushMicrotasks();
		expect(factory.mock.calls.length).toBeGreaterThan(callsBeforeQuiet);
		await pool.dispose();
	});

	it('should not replenish on release while idle', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 2, IDLE_TIMEOUT_MS);
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

	it('should clear the idle timer on dispose', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();

		await pool.dispose();

		const callsBeforeAdvance = factory.mock.calls.length;
		vi.advanceTimersByTime(IDLE_TIMEOUT_MS * 2);
		await flushMicrotasks();
		expect(factory.mock.calls.length).toBe(callsBeforeAdvance);
	});

	it('should await in-flight scale-up during dispose', async () => {
		const { factory, pendingResolvers } = createDeferredBridgeFactory();
		const scaleUpBridges = [createMockBridge(), createMockBridge()];

		const pool = new IdleScalingPool(factory, 2, IDLE_TIMEOUT_MS);
		const initPromise = pool.initialize();
		pendingResolvers.shift()!(createMockBridge());
		pendingResolvers.shift()!(createMockBridge());
		await initPromise;
		await flushMicrotasks();

		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await flushMicrotasks();
		expect(pendingResolvers.length).toBe(2);

		let disposeResolved = false;
		const disposePromise = pool.dispose().then(() => {
			disposeResolved = true;
		});
		await flushMicrotasks();

		expect(disposeResolved).toBe(false);

		pendingResolvers.shift()!(scaleUpBridges[0]);
		pendingResolvers.shift()!(scaleUpBridges[1]);
		await flushMicrotasks();

		await disposePromise;
		expect(disposeResolved).toBe(true);
		expect(scaleUpBridges[0].dispose).toHaveBeenCalled();
		expect(scaleUpBridges[1].dispose).toHaveBeenCalled();
	});

	it('should await in-flight scale-down during dispose', async () => {
		const initialBridge = createMockBridge();
		let resolveDispose: (() => void) | null = null;
		vi.mocked(initialBridge.dispose).mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveDispose = resolve;
				}),
		);

		const factory = vi.fn().mockResolvedValue(initialBridge);
		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();

		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(initialBridge.dispose).toHaveBeenCalled();
		expect(resolveDispose).not.toBeNull();

		let disposeResolved = false;
		const disposePromise = pool.dispose().then(() => {
			disposeResolved = true;
		});
		await flushMicrotasks();

		expect(disposeResolved).toBe(false);

		resolveDispose!();
		await flushMicrotasks();

		await disposePromise;
		expect(disposeResolved).toBe(true);
	});

	it('should preserve current behavior when idleTimeoutMs is unset', async () => {
		const factory = createFactory();
		const pool = new IdleScalingPool(factory, 2);
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

	it('should emit scaled_to_zero and scaled_up metrics once per transition', async () => {
		const factory = createFactory();
		const observability = createMockObservability();
		const pool = new IdleScalingPool(
			factory,
			1,
			IDLE_TIMEOUT_MS,
			undefined,
			undefined,
			observability,
		);
		await pool.initialize();
		await flushMicrotasks();

		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.pool.scaled_to_zero', 1);

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.pool.scaled_up', 1);

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await flushMicrotasks();

		const scaledUpCalls = vi
			.mocked(observability.metrics.counter)
			.mock.calls.filter((call) => call[0] === 'expression.pool.scaled_up');
		const scaledToZeroCalls = vi
			.mocked(observability.metrics.counter)
			.mock.calls.filter((call) => call[0] === 'expression.pool.scaled_to_zero');
		expect(scaledUpCalls.length).toBe(1);
		expect(scaledToZeroCalls.length).toBe(1);

		await pool.waitForReplenishment();
		await pool.dispose();
	});

	it('should make concurrent dispose calls wait for the same teardown', async () => {
		const bridge = createMockBridge();
		let resolveDispose: (() => void) | null = null;
		vi.mocked(bridge.dispose).mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveDispose = resolve;
				}),
		);

		const factory = vi.fn().mockResolvedValue(bridge);
		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();

		let firstResolved = false;
		let secondResolved = false;
		const first = pool.dispose().then(() => {
			firstResolved = true;
		});
		const second = pool.dispose().then(() => {
			secondResolved = true;
		});
		await flushMicrotasks();

		expect(firstResolved).toBe(false);
		expect(secondResolved).toBe(false);

		resolveDispose!();
		await flushMicrotasks();
		await Promise.all([first, second]);

		expect(firstResolved).toBe(true);
		expect(secondResolved).toBe(true);
		expect(factory).toHaveBeenCalledTimes(1);
		expect(bridge.dispose).toHaveBeenCalledTimes(1);
	});

	it('should recover from scale-up failure by retrying on next acquire', async () => {
		const initialBridge = createMockBridge();
		let callCount = 0;
		const factory = vi.fn().mockImplementation(async () => {
			const idx = callCount++;
			if (idx === 0) return initialBridge;
			if (idx === 1) throw new Error('transient scale-up failure');
			return createMockBridge();
		});

		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();

		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await pool.waitForReplenishment();
		await flushMicrotasks();

		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await pool.waitForReplenishment();
		await flushMicrotasks();

		const bridge = pool.acquire();
		expect(bridge).toBeDefined();
		await pool.dispose();
	});

	it('should not clobber a concurrent scale-up when scale-down finishes', async () => {
		const oldBridge = createMockBridge();
		let resolveOldDispose: (() => void) | null = null;
		vi.mocked(oldBridge.dispose).mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveOldDispose = resolve;
				}),
		);

		const newBridge = createMockBridge();
		let call = 0;
		const factory = vi.fn().mockImplementation(async () => {
			call++;
			if (call === 1) return oldBridge;
			if (call === 2) return newBridge;
			return createMockBridge();
		});

		const pool = new IdleScalingPool(factory, 1, IDLE_TIMEOUT_MS);
		await pool.initialize();
		await flushMicrotasks();

		// Trigger scale-down — oldBridge.dispose hangs until we resolve it
		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();
		expect(oldBridge.dispose).toHaveBeenCalled();
		expect(resolveOldDispose).not.toBeNull();

		// Acquire during scale-down triggers a concurrent scale-up
		expect(() => pool.acquire()).toThrow(PoolExhaustedError);
		await flushMicrotasks();

		// Let scale-down finish — its .finally must not clobber the new inner pool
		resolveOldDispose!();
		await flushMicrotasks();
		await pool.waitForReplenishment();

		// New pool should still be serving
		const bridge = pool.acquire();
		expect(bridge).toBe(newBridge);

		await pool.dispose();
	});
});
