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

	it('drops any arguments the isolate tries to pass to the host method', () => {
		// The host's `WorkflowDataProxy` throws if `$input.first/last/all` is
		// called with any arguments. The typed-RPC schemas have no fields
		// besides `type`, so the in-isolate stub closes over a zero-arg
		// invocation regardless of what the expression passed. Documenting:
		// `$input.first('arg')` produces the same result as `$input.first()`
		// because the host method is invoked with no arguments either way.
		const args: unknown[][] = [];
		const data: Record<string, unknown> = {
			$input: {
				first: (...received: unknown[]) => {
					args.push(received);
					return { json: { ok: true } };
				},
			},
		};

		evaluator.evaluate('{{ $input.first() }}', data, caller);
		evaluator.evaluate("{{ $input.first('ignored') }}", data, caller);
		evaluator.evaluate('{{ $input.first(1, 2, 3) }}', data, caller);

		expect(args).toEqual([[], [], []]);
	});

	it('non-RPC properties (`.item`) still delegate to the lazy proxy (host getter)', () => {
		// `.item` on $input is a host getter, not a typed RPC. The synthetic
		// proxy should fall through to the lazy proxy which fetches via
		// getValueAtPath — and the host's `.item` getter must be invoked on
		// the host side. Defining `.item` as a real getter (instead of a
		// plain property) proves the getter ran: the bridge can only reach
		// it via host-side property access, which is what `getValueAtPath`
		// does. If the routing had wrongly sent a typed RPC, the dispatcher
		// would reject the unknown `type` and return undefined.
		let getterInvocations = 0;
		const data: Record<string, unknown> = {
			$input: Object.defineProperty({} as Record<string, unknown>, 'item', {
				get() {
					getterInvocations += 1;
					return { id: 42 };
				},
				enumerable: true,
			}),
		};

		const result = evaluator.evaluate('{{ $input.item.id }}', data, caller);
		expect(result).toBe(42);
		expect(getterInvocations).toBeGreaterThan(0);
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

describe('Typed RPC: $items() routes via getItems', () => {
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

	it('returns the value of data.$items() with no args', () => {
		const data: Record<string, unknown> = {
			$items: () => [{ json: { id: 1 } }, { json: { id: 2 } }],
		};

		const result = evaluator.evaluate('{{ $items() }}', data, caller);
		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }]);
	});

	it('forwards nodeName, outputIndex, and runIndex verbatim', () => {
		const calls: Array<unknown[]> = [];
		const data: Record<string, unknown> = {
			$items: (...args: unknown[]) => {
				calls.push(args);
				return [];
			},
		};

		evaluator.evaluate('{{ $items() }}', data, caller);
		evaluator.evaluate("{{ $items('Foo') }}", data, caller);
		evaluator.evaluate("{{ $items('Foo', 1) }}", data, caller);
		evaluator.evaluate("{{ $items('Foo', 0, 2) }}", data, caller);

		expect(calls).toEqual([
			[undefined, undefined, undefined],
			['Foo', undefined, undefined],
			['Foo', 1, undefined],
			['Foo', 0, 2],
		]);
	});

	it('accepts negative runIndex (host sentinel for "latest")', () => {
		// `WorkflowDataProxy.$items` uses runIndex === undefined ? -1 : runIndex,
		// so callers can pass -1 explicitly to request the latest run. The
		// schema permits negatives via z.number().int() (no .nonnegative()).
		const calls: Array<unknown[]> = [];
		const data: Record<string, unknown> = {
			$items: (...args: unknown[]) => {
				calls.push(args);
				return [];
			},
		};

		evaluator.evaluate("{{ $items('Foo', 0, -1) }}", data, caller);

		expect(calls).toEqual([['Foo', 0, -1]]);
	});

	it('handles missing data.$items gracefully (returns undefined)', () => {
		const data: Record<string, unknown> = {};

		const result = evaluator.evaluate('{{ $items() }}', data, caller);
		expect(result).toBeUndefined();
	});
});

describe('Typed RPC: $fromAI() routes via fromAi', () => {
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

	it('returns the resolved value of data.$fromAI(name)', () => {
		const data: Record<string, unknown> = {
			$fromAI: (name?: string) => `resolved:${name}`,
		};

		const result = evaluator.evaluate("{{ $fromAI('placeholder_one') }}", data, caller);
		expect(result).toBe('resolved:placeholder_one');
	});

	it('forwards name, description, type, and defaultValue verbatim', () => {
		const calls: Array<unknown[]> = [];
		const data: Record<string, unknown> = {
			$fromAI: (...args: unknown[]) => {
				calls.push(args);
				return 'ok';
			},
		};

		evaluator.evaluate("{{ $fromAI('a') }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', 'description') }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', 'description', 'number') }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', 'description', 'number', 42) }}", data, caller);

		expect(calls).toEqual([
			['a', undefined, undefined, undefined],
			['a', 'description', undefined, undefined],
			['a', 'description', 'number', undefined],
			['a', 'description', 'number', 42],
		]);
	});

	it('forwards arbitrary defaultValue shapes (number, string, boolean, null, object)', () => {
		// `defaultValue` is `z.unknown()` because the host applies no shape
		// constraint — it just returns the fallback via `??`. Verify the
		// bridge structured-clones each shape through to the host.
		const calls: Array<unknown[]> = [];
		const data: Record<string, unknown> = {
			$fromAI: (...args: unknown[]) => {
				calls.push(args);
				return 'ok';
			},
		};

		evaluator.evaluate("{{ $fromAI('a', '', 'string', 42) }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', '', 'string', 'fallback') }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', '', 'string', true) }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', '', 'string', null) }}", data, caller);
		evaluator.evaluate("{{ $fromAI('a', '', 'string', { nested: 'value' }) }}", data, caller);

		expect(calls.map((c) => c[3])).toEqual([42, 'fallback', true, null, { nested: 'value' }]);
	});

	it('$fromAi (mid-case) alias routes through the same handler', () => {
		const data: Record<string, unknown> = {
			$fromAI: (name?: string) => `via-aliases:${name}`,
		};

		expect(evaluator.evaluate("{{ $fromAi('x') }}", data, caller)).toBe('via-aliases:x');
	});

	it('$fromai (all-lower) alias routes through the same handler', () => {
		const data: Record<string, unknown> = {
			$fromAI: (name?: string) => `via-aliases:${name}`,
		};

		expect(evaluator.evaluate("{{ $fromai('x') }}", data, caller)).toBe('via-aliases:x');
	});

	it('handles missing data.$fromAI gracefully (returns undefined)', () => {
		const data: Record<string, unknown> = {};

		const result = evaluator.evaluate("{{ $fromAI('placeholder') }}", data, caller);
		expect(result).toBeUndefined();
	});
});
