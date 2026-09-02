import { describe, it, expect, vi } from 'vitest';

import { createMockBridge, createMockObservability } from '../../__tests__/helpers';
import { EXPRESSION_METRICS } from '../../observability/metrics';
import type { ObservabilityProvider, RuntimeBridge } from '../../types';
import { ExpressionEvaluator } from '../expression-evaluator';

// Lazy acquisition (lazyAcquire: true): acquire() only opens a scope, the
// bridge is created on the first evaluate() that reaches the engine, and a
// scope that never evaluates costs nothing.

const acquiredCount = (observability: ObservabilityProvider) =>
	vi
		.mocked(observability.metrics.counter)
		.mock.calls.filter(([name]) => name === EXPRESSION_METRICS.poolAcquired.name).length;

const setup = async ({ syncInit = true }: { syncInit?: boolean } = {}) => {
	const bridges: RuntimeBridge[] = [];
	const createBridge = vi.fn(() => {
		const bridge = syncInit
			? { ...createMockBridge(), initializeSync: vi.fn() }
			: createMockBridge();
		bridges.push(bridge);
		return bridge;
	});
	const observability = createMockObservability();
	const evaluator = new ExpressionEvaluator({
		createBridge,
		maxCodeCacheSize: 100,
		poolSize: 1,
		lazyAcquire: true,
		observability,
	});
	await evaluator.initialize();
	return { evaluator, bridges, createBridge, observability };
};

const DATA = { $json: { x: 1 } };

describe('ExpressionEvaluator — lazy acquisition', () => {
	it('acquire opens a scope without consuming a bridge', async () => {
		const { evaluator, createBridge, observability } = await setup();

		const caller = {};
		expect(await evaluator.acquire(caller)).toBe(true);
		expect(await evaluator.acquire(caller)).toBe(false);

		// Only the pool warmup created a bridge; none was handed out.
		expect(createBridge).toHaveBeenCalledTimes(1);
		expect(acquiredCount(observability)).toBe(0);

		await evaluator.dispose();
	});

	it('creates the bridge on the first engine evaluation and reuses it', async () => {
		const { evaluator, bridges, observability } = await setup();

		const caller = {};
		await evaluator.acquire(caller);
		evaluator.evaluate('{{ $json.x }}', DATA, caller);
		evaluator.evaluate('{{ $json.x }}', DATA, caller);

		expect(acquiredCount(observability)).toBe(1);
		expect(bridges[0].execute).toHaveBeenCalledTimes(2);

		await evaluator.release(caller);
		await evaluator.dispose();
	});

	it('a scope that never evaluates releases without touching the pool', async () => {
		const { evaluator, bridges, observability } = await setup();

		const caller = {};
		await evaluator.acquire(caller);
		await evaluator.release(caller);

		expect(acquiredCount(observability)).toBe(0);
		expect(bridges[0].dispose).not.toHaveBeenCalled();

		await evaluator.dispose();
	});

	it('evaluating without an open scope throws', async () => {
		const { evaluator } = await setup();

		expect(() => evaluator.evaluate('{{ $json.x }}', DATA, {})).toThrow('No bridge acquired');

		await evaluator.dispose();
	});

	it('evaluating after release throws (the scope is closed)', async () => {
		const { evaluator } = await setup();

		const caller = {};
		await evaluator.acquire(caller);
		await evaluator.release(caller);

		expect(() => evaluator.evaluate('{{ $json.x }}', DATA, caller)).toThrow('No bridge acquired');

		await evaluator.dispose();
	});

	it('cold-starts synchronously via initializeSync when the pool is exhausted', async () => {
		const { evaluator, bridges, createBridge, observability } = await setup();

		const callerA = {};
		const callerB = {};
		await evaluator.acquire(callerA);
		await evaluator.acquire(callerB);

		// A pops the warm bridge; replenishment cannot complete inside this
		// synchronous block, so B must cold-start synchronously.
		evaluator.evaluate('{{ $json.x }}', DATA, callerA);
		evaluator.evaluate('{{ $json.x }}', DATA, callerB);

		const coldBridge = bridges[createBridge.mock.calls.length - 1];
		expect(coldBridge.initializeSync).toHaveBeenCalledTimes(1);
		expect(acquiredCount(observability)).toBe(2);

		await evaluator.release(callerA);
		await evaluator.release(callerB);
		await evaluator.dispose();
	});

	it('reports a clear error when the bridge has no synchronous initializer', async () => {
		const { evaluator } = await setup({ syncInit: false });

		const callerA = {};
		const callerB = {};
		await evaluator.acquire(callerA);
		await evaluator.acquire(callerB);

		evaluator.evaluate('{{ $json.x }}', DATA, callerA);
		expect(() => evaluator.evaluate('{{ $json.x }}', DATA, callerB)).toThrow(
			'no synchronous initializer',
		);

		await evaluator.release(callerA);
		await evaluator.release(callerB);
		await evaluator.dispose();
	});

	it('release disposes a lazily created bridge', async () => {
		const { evaluator, bridges } = await setup();

		const caller = {};
		await evaluator.acquire(caller);
		evaluator.evaluate('{{ $json.x }}', DATA, caller);
		await evaluator.release(caller);

		expect(bridges[0].dispose).toHaveBeenCalledTimes(1);

		await evaluator.dispose();
	});
});
