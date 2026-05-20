/**
 * Regression suite for the typed-RPC routing pattern.
 *
 * The pattern: `$('Foo').first()` is routed through the dedicated
 * `getNodeFirst` typed RPC rather than the generic `callFunctionAtPath`
 * channel. The in-isolate runtime exposes a synthetic proxy on
 * `target.$(...)` that intercepts `.first` and sends a typed envelope via
 * `callHost`; the bridge handler reads the literal string `"first"`
 * from the host-side proxy. The property name is compile-time fixed and
 * cannot be influenced by expression input.
 *
 * Each typed RPC should land with a test in this file
 * confirming:
 *   1. The method routes via the typed RPC, returning the expected result.
 *   2. The typed RPC handler only invokes the specific host-side method
 *      its schema names — no other property access on the host proxy.
 *   3. Arg validation rejects ill-typed inputs at the bridge boundary.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';

describe("Typed RPC: $('Foo').first() routes via getNodeFirst", () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
			maxCodeCacheSize: 64,
		});
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	it('returns the value of data.$(nodeName).first()', () => {
		const data: Record<string, unknown> = {
			$: (nodeName: string) => {
				if (nodeName !== 'SourceNode') throw new Error(`unexpected node: ${nodeName}`);
				return {
					first: () => ({ json: { id: 42, name: 'Alice' } }),
				};
			},
		};

		const result = evaluator.evaluate("{{ $('SourceNode').first() }}", data, caller) as Record<
			string,
			unknown
		>;

		expect(result).toEqual({ json: { id: 42, name: 'Alice' } });
	});

	it('forwards branchIndex and runIndex args verbatim', () => {
		const calls: Array<unknown[]> = [];
		const data: Record<string, unknown> = {
			$: (_nodeName: string) => ({
				first: (...args: unknown[]) => {
					calls.push(args);
					return { json: { ok: true } };
				},
			}),
		};

		evaluator.evaluate("{{ $('Foo').first() }}", data, caller);
		evaluator.evaluate("{{ $('Foo').first(2) }}", data, caller);
		evaluator.evaluate("{{ $('Foo').first(0, 3) }}", data, caller);

		expect(calls).toEqual([
			[undefined, undefined],
			[2, undefined],
			[0, 3],
		]);
	});

	it('only invokes .first on the host proxy — never other methods', () => {
		const invoked: string[] = [];
		const data: Record<string, unknown> = {
			$: (_nodeName: string) =>
				new Proxy(
					{},
					{
						get(_t, prop) {
							if (typeof prop === 'symbol') return undefined;
							invoked.push(prop);
							if (prop === 'first') return () => ({ json: { ok: true } });
							// Any other method getting invoked would be a routing bug:
							return () => {
								throw new Error(`unexpected method invoked: ${prop}`);
							};
						},
					},
				),
		};

		evaluator.evaluate("{{ $('Foo').first() }}", data, caller);

		// The typed-RPC handler reads .first off the host proxy and invokes it.
		// No other property on the host proxy should be touched.
		expect(invoked).toEqual(['first']);
	});

	it('rejects non-string nodeName at the bridge boundary', () => {
		// data.$ is never called when validation fails — capture that.
		let dollarCalls = 0;
		const data: Record<string, unknown> = {
			$: () => {
				dollarCalls++;
				return { first: () => ({ json: { ok: true } }) };
			},
		};

		// Tournament's runtime polyfill won't normally produce a non-string
		// nodeName; this asserts the bridge's own type validation rejects
		// the bad input rather than forwarding it to data.$.
		// The result is undefined because the runtime error handler
		// (E() injected by the bridge) swallows generic errors and returns
		// undefined — same shape as the legacy engine.
		const result = evaluator.evaluate('{{ $(123).first() }}', data, caller);
		expect(result).toBeUndefined();
		expect(dollarCalls).toBe(0);
	});

	it('handles missing data.$ gracefully (returns undefined, does not crash)', () => {
		const data: Record<string, unknown> = {};

		const result = evaluator.evaluate("{{ $('Foo').first() }}", data, caller);
		expect(result).toBeUndefined();
	});

	it('returns undefined when the host proxy has no .first method', () => {
		const data: Record<string, unknown> = {
			$: () => ({}),
		};

		const result = evaluator.evaluate("{{ $('Foo').first() }}", data, caller);
		expect(result).toBeUndefined();
	});
});
