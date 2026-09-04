import { describe, it, expect } from 'vitest';

import { createBridge, engineName } from './test-bridge';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';

// The empirical question behind lazy acquisition: when the pool is exhausted,
// can a real bridge be built from inside the synchronous evaluate() path?
// isolated-vm uses its sync APIs directly; QuickJS relies on the WASM module
// cached by pool warmup (an earlier async initialize).

describe(`Lazy acquisition: synchronous cold start (${engineName})`, () => {
	it('builds a working bridge synchronously when the pool is exhausted', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge,
			maxCodeCacheSize: 100,
			poolSize: 1,
			lazyAcquire: true,
		});
		await evaluator.initialize();

		const callerA = {};
		const callerB = {};
		await evaluator.acquire(callerA);
		await evaluator.acquire(callerB);

		// A pops the warm bridge. B evaluates in the same synchronous block, so
		// replenishment cannot have completed: B must cold-start synchronously.
		const resultA = evaluator.evaluate('{{ $json.x + 1 }}', { $json: { x: 1 } }, callerA);
		const start = performance.now();
		const resultB = evaluator.evaluate('{{ $json.x * 2 }}', { $json: { x: 21 } }, callerB);
		const coldStartMs = performance.now() - start;

		expect(resultA).toBe(2);
		expect(resultB).toBe(42);

		// The prototype exists to measure this number.
		// eslint-disable-next-line no-console
		console.info(
			`[lazy-sync-cold-start] ${engineName}: exhausted-pool evaluation (cold start + eval) took ${coldStartMs.toFixed(1)}ms`,
		);

		await evaluator.release(callerA);
		await evaluator.release(callerB);
		await evaluator.dispose();
	});

	it('a scope whose expressions never reach the engine consumes no bridge', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge,
			maxCodeCacheSize: 100,
			poolSize: 1,
			lazyAcquire: true,
		});
		await evaluator.initialize();

		// Many sequential scopes, none evaluating: with eager acquisition this
		// would have built and disposed a bridge per scope.
		for (let i = 0; i < 25; i++) {
			const caller = {};
			await evaluator.acquire(caller);
			await evaluator.release(caller);
		}

		// The pool still holds its single warm bridge: an evaluation now must
		// not need a cold start (it pops the warm one).
		const caller = {};
		await evaluator.acquire(caller);
		const start = performance.now();
		const result = evaluator.evaluate('{{ $json.x }}', { $json: { x: 'warm' } }, caller);
		const elapsed = performance.now() - start;

		expect(result).toBe('warm');
		// A warm pop plus one evaluation is far below any cold start; generous
		// bound to stay unflaky on CI.
		expect(elapsed).toBeLessThan(500);

		await evaluator.release(caller);
		await evaluator.dispose();
	});
});
