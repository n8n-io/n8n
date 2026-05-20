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

describe("Typed RPC: $('Foo').last() routes via getNodeLast", () => {
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

	it('returns the value of data.$(nodeName).last() and forwards args', () => {
		const calls: Array<unknown[]> = [];
		const data: Record<string, unknown> = {
			$: (nodeName: string) => {
				if (nodeName !== 'SourceNode') throw new Error(`unexpected node: ${nodeName}`);
				return {
					last: (...args: unknown[]) => {
						calls.push(args);
						return { json: { id: 99, name: 'Zelda' } };
					},
				};
			},
		};

		const result = evaluator.evaluate("{{ $('SourceNode').last(1, 2) }}", data, caller) as Record<
			string,
			unknown
		>;

		expect(result).toEqual({ json: { id: 99, name: 'Zelda' } });
		expect(calls).toEqual([[1, 2]]);
	});

	it('only invokes .last on the host proxy — never other methods', () => {
		const invoked: string[] = [];
		const data: Record<string, unknown> = {
			$: (_nodeName: string) =>
				new Proxy(
					{},
					{
						get(_t, prop) {
							if (typeof prop === 'symbol') return undefined;
							invoked.push(prop);
							if (prop === 'last') return () => ({ json: { ok: true } });
							return () => {
								throw new Error(`unexpected method invoked: ${prop}`);
							};
						},
					},
				),
		};

		evaluator.evaluate("{{ $('Foo').last() }}", data, caller);

		expect(invoked).toEqual(['last']);
	});
});

describe("Typed RPC: $('Foo').all() routes via getNodeAll", () => {
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

	it('returns the full array from data.$(nodeName).all()', () => {
		const data: Record<string, unknown> = {
			$: (_nodeName: string) => ({
				all: () => [{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }],
			}),
		};

		const result = evaluator.evaluate("{{ $('Foo').all() }}", data, caller);

		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]);
	});

	it('only invokes .all on the host proxy — never other methods', () => {
		const invoked: string[] = [];
		const data: Record<string, unknown> = {
			$: (_nodeName: string) =>
				new Proxy(
					{},
					{
						get(_t, prop) {
							if (typeof prop === 'symbol') return undefined;
							invoked.push(prop);
							if (prop === 'all') return () => [];
							return () => {
								throw new Error(`unexpected method invoked: ${prop}`);
							};
						},
					},
				),
		};

		evaluator.evaluate("{{ $('Foo').all() }}", data, caller);

		expect(invoked).toEqual(['all']);
	});
});

describe("Typed RPC: $('Foo') proxy fallthrough and `in` checks", () => {
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

	it('non-RPC properties (`.params`) delegate to the lazy proxy', () => {
		// `.params` on $('Foo') is not a typed RPC. The synthetic proxy's get
		// trap should fall through to the underlying lazy proxy, which fetches
		// the value from the host via getValueAtPath. Reading `params.value`
		// (a primitive) exercises that path end-to-end.
		const data: Record<string, unknown> = {
			$: (_nodeName: string) => ({
				params: { mode: 'manual' },
			}),
		};

		const result = evaluator.evaluate("{{ $('Foo').params.mode }}", data, caller);
		expect(result).toBe('manual');
	});

	it("'first', 'last', 'all' are reported by the synthetic proxy's `has` trap", () => {
		// Tournament's variable polyfill compiles to `("x" in obj ? obj : global).x`,
		// so the typed-RPC method names must answer `true` for `in` checks even
		// though the inner target is `{}`. Without the `has` trap, the lookup
		// would fall through to global and miss the typed-RPC routing.
		const data: Record<string, unknown> = {
			$: (_nodeName: string) => ({
				first: () => ({ json: { ok: true } }),
				last: () => ({ json: { ok: true } }),
				all: () => [],
			}),
		};

		expect(evaluator.evaluate("{{ 'first' in $('Foo') }}", data, caller)).toBe(true);
		expect(evaluator.evaluate("{{ 'last' in $('Foo') }}", data, caller)).toBe(true);
		expect(evaluator.evaluate("{{ 'all' in $('Foo') }}", data, caller)).toBe(true);
	});
});

describe('Typed RPC: $input.{first,last,all} route via getInput*', () => {
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

	it('$input.first() returns the value of data.$input.first()', () => {
		const data: Record<string, unknown> = {
			$input: {
				first: () => ({ json: { id: 1, name: 'first-item' } }),
			},
		};

		const result = evaluator.evaluate('{{ $input.first() }}', data, caller);
		expect(result).toEqual({ json: { id: 1, name: 'first-item' } });
	});

	it('$input.last() returns the value of data.$input.last()', () => {
		const data: Record<string, unknown> = {
			$input: {
				last: () => ({ json: { id: 9, name: 'last-item' } }),
			},
		};

		const result = evaluator.evaluate('{{ $input.last() }}', data, caller);
		expect(result).toEqual({ json: { id: 9, name: 'last-item' } });
	});

	it('$input.all() returns the array from data.$input.all()', () => {
		const data: Record<string, unknown> = {
			$input: {
				all: () => [{ json: { id: 1 } }, { json: { id: 2 } }],
			},
		};

		const result = evaluator.evaluate('{{ $input.all() }}', data, caller);
		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }]);
	});

	it('handler invokes only the named method on the host proxy', () => {
		// Spy on every property access. Each typed-RPC call should touch only
		// the specific method its schema names — no other property on the
		// host proxy should be dereferenced.
		const accessed: string[] = [];
		const data: Record<string, unknown> = {
			$input: new Proxy(
				{},
				{
					get(_t, prop) {
						if (typeof prop === 'symbol') return undefined;
						accessed.push(prop);
						if (prop === 'first') return () => ({ json: { ok: true } });
						if (prop === 'last') return () => ({ json: { ok: true } });
						if (prop === 'all') return () => [];
						return () => {
							throw new Error(`unexpected method invoked: ${prop}`);
						};
					},
				},
			),
		};

		evaluator.evaluate('{{ $input.first() }}', data, caller);
		evaluator.evaluate('{{ $input.last() }}', data, caller);
		evaluator.evaluate('{{ $input.all() }}', data, caller);

		expect(accessed).toEqual(['first', 'last', 'all']);
	});

	it('non-RPC properties (`.item`) still delegate to the lazy proxy', () => {
		// `.item` on $input is a host getter, not a typed RPC. The synthetic
		// proxy should fall through to the lazy proxy which fetches via
		// getValueAtPath. Reading `.item.id` (a primitive on the getter's
		// result) exercises that path end-to-end.
		const data: Record<string, unknown> = {
			$input: {
				item: { id: 42 },
			},
		};

		const result = evaluator.evaluate('{{ $input.item.id }}', data, caller);
		expect(result).toBe(42);
	});

	it("'first', 'last', 'all' are reported by $input's `has` trap", () => {
		const data: Record<string, unknown> = {
			$input: {
				first: () => undefined,
				last: () => undefined,
				all: () => [],
			},
		};

		expect(evaluator.evaluate("{{ 'first' in $input }}", data, caller)).toBe(true);
		expect(evaluator.evaluate("{{ 'last' in $input }}", data, caller)).toBe(true);
		expect(evaluator.evaluate("{{ 'all' in $input }}", data, caller)).toBe(true);
	});
});
