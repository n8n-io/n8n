/**
 * Regression test: in the VM engine, helper functions resolve from the
 * in-isolate runtime — they MUST NOT fall through to host-side `data`
 * properties of the same name. Tournament's `VariablePolyfill` rewrites a
 * bare identifier `extend(...)` to `("extend" in this ? this : global).extend`
 * where `this` is the in-isolate context proxy. The proxy's `has` trap finds
 * `target.extend` (set in `runtime/context.ts:92-93`) and returns the
 * in-isolate copy before any host lookup happens.
 *
 * Why this matters under the threat model: every host function reachable
 * from `data` becomes a callable target via the bridge's `callFunctionAtPath`.
 * Confirming that helpers resolve in-isolate lets us safely strip them from
 * the VM-path `data` object (see `expression.ts` shouldUseVm guard) without
 * losing functionality. Keeping the helpers shadowed is a load-bearing
 * structural invariant of the security model.
 *
 * If this test ever fails, one of the following changed:
 *   - Tournament's polyfill no longer rewrites bare identifiers to context-first
 *   - `target.extend` / `target.extendOptional` were removed from `context.ts`
 *   - A new resolution path was added that prefers host `data` over context
 * Any of these is a meaningful security regression — investigate before
 * "fixing" the test.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';

describe('Host-fn shadowing: data.extend / data.extendOptional must not be invoked in VM mode', () => {
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

	it('does NOT invoke host-side data.extend when expression calls extend(...)', () => {
		let hostExtendCalls = 0;
		const data: Record<string, unknown> = {
			$json: { items: [3, 1, 2] },
			extend: (...args: unknown[]) => {
				hostExtendCalls++;
				throw new Error(`host-side data.extend was invoked with: ${JSON.stringify(args)}`);
			},
			extendOptional: (...args: unknown[]) => {
				hostExtendCalls++;
				throw new Error(`host-side data.extendOptional was invoked with: ${JSON.stringify(args)}`);
			},
		};

		// Direct invocation of `extend()` from the expression.
		// Tournament's polyfill rewrites bare `extend` to
		// `("extend" in this ? this : global).extend`.
		// `this` is the in-isolate context (target), where target.extend is
		// the in-isolate extend function. Host-side data.extend should never run.
		const result = evaluator.evaluate('{{ extend([3, 1, 2], "first", []) }}', data, caller);

		expect(result).toBe(3);
		expect(hostExtendCalls).toBe(0);
	});

	it('does NOT invoke host-side data.extendOptional when expression calls extendOptional(...)', () => {
		let hostExtendOptionalCalls = 0;
		const data: Record<string, unknown> = {
			$json: { x: 'abc' },
			extend: (...args: unknown[]) => {
				throw new Error(`host-side data.extend was invoked with: ${JSON.stringify(args)}`);
			},
			extendOptional: (...args: unknown[]) => {
				hostExtendOptionalCalls++;
				throw new Error(`host-side data.extendOptional was invoked with: ${JSON.stringify(args)}`);
			},
		};

		// extendOptional returns the function (or undefined) — call it then.
		const result = evaluator.evaluate('{{ extendOptional("hello", "isEmpty")() }}', data, caller);

		// "hello".isEmpty() should be false (non-empty string)
		expect(result).toBe(false);
		expect(hostExtendOptionalCalls).toBe(0);
	});

	it('does NOT invoke host-side data.extend when expression uses an extension method directly', () => {
		// This test runs after extendSyntax-style expansion would have happened
		// in the workflow package. We mimic that here by calling extend() directly,
		// which is what Tournament's transformations end up producing.
		let hostExtendCalls = 0;
		const data: Record<string, unknown> = {
			$json: { items: [{ a: 1 }, { a: 2 }, { a: 3 }] },
			extend: (...args: unknown[]) => {
				hostExtendCalls++;
				throw new Error(`host-side data.extend was invoked with: ${JSON.stringify(args)}`);
			},
			extendOptional: (...args: unknown[]) => {
				throw new Error('host-side data.extendOptional was invoked');
			},
		};

		const result = evaluator.evaluate('{{ extend($json.items, "pluck", ["a"]) }}', data, caller);

		expect(result).toEqual([1, 2, 3]);
		expect(hostExtendCalls).toBe(0);
	});
});
