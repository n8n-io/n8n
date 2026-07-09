import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExpressionEvaluator } from '../expression-evaluator';
import type { RuntimeBridge } from '../../types';
import { createMockBridge, flushMicrotasks } from '../../__tests__/helpers';

const IDLE_TIMEOUT_MS = 5_000;

describe('ExpressionEvaluator', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should cold-start a bridge when the pool has scaled to zero', async () => {
		const bridges: RuntimeBridge[] = [];
		const createBridge = () => {
			const bridge = createMockBridge();
			vi.mocked(bridge.execute).mockReturnValue('result');
			bridges.push(bridge);
			return bridge;
		};

		const evaluator = new ExpressionEvaluator({
			createBridge,
			idleTimeoutMs: IDLE_TIMEOUT_MS,
			maxCodeCacheSize: 100,
		});
		await evaluator.initialize();
		await flushMicrotasks();

		// Let the pool scale to 0
		vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
		await flushMicrotasks();
		expect(bridges[0].dispose).toHaveBeenCalled();

		// Pool now throws PoolExhaustedError on acquire → evaluator must cold-start
		const caller = {};
		await evaluator.acquire(caller);

		// Cold-start bridge should be usable for evaluation
		const result = evaluator.evaluate('$json.x', { $json: { x: 1 } }, caller);
		expect(result).toBe('result');

		await evaluator.release(caller);
		await evaluator.dispose();
	});
});
