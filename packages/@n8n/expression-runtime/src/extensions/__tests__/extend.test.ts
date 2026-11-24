import { describe, it, expect } from 'vitest';

import { extend, extendOptional, UNSAFE_PROPERTY_NAMES } from '../extend';
import { ExpressionExtensionError } from '../expression-extension-error';

/** Returns a safe name on the first toString() call, then `payload` thereafter. */
function statefulName(payload: string, safeFirstReturn = 'totallyFineName') {
	let calls = 0;
	const obj = Object.create(null) as { toString: () => string; calls: () => number };
	obj.toString = () => {
		calls += 1;
		return calls === 1 ? safeFirstReturn : payload;
	};
	obj.calls = () => calls;
	return obj;
}

describe('extend', () => {
	describe('property-name resolution is stable across lookup branches', () => {
		it('does not resolve a callable when functionName.toString() returns different values on successive calls', () => {
			const k = statefulName('constructor', 'x');
			const body = 'return "value"';

			let result: unknown;
			try {
				result = extend(function () {}, k as unknown as string, [body]);
			} catch (err) {
				expect(err).toBeInstanceOf(ExpressionExtensionError);
				return;
			}

			expect(typeof result).not.toBe('function');
		});

		// One case per typed-lookup branch in findExtendedFunction.
		it.each([
			['array input', [] as unknown],
			['string input', 'hello' as unknown],
			['number input', 42 as unknown],
			['boolean input', true as unknown],
			['plain object input', {} as unknown],
			['ISO-date string input', '2024-01-02T03:04:05.000Z' as unknown],
			['Date input', new Date() as unknown],
			['function input', function () {} as unknown],
		])('returns no callable for stateful functionName across %s', (_label, input) => {
			const k = statefulName('constructor');

			let returned: unknown;
			try {
				returned = extend(input, k as unknown as string, ['return "value"']);
			} catch (err) {
				expect(err).toBeInstanceOf(ExpressionExtensionError);
				return;
			}

			if (typeof returned === 'function') {
				let invokeResult: unknown;
				try {
					invokeResult = (returned as (...a: unknown[]) => unknown)();
				} catch {
					return;
				}
				expect(invokeResult).not.toBe('value');
			}
		});

		it('extendOptional() returns undefined for stateful functionName', () => {
			const k = statefulName('constructor', 'x');
			const found = extendOptional(function () {}, k as unknown as string);

			expect(found).toBeUndefined();
		});
	});

	describe('UNSAFE_PROPERTY_NAMES upfront denylist', () => {
		it.each([...UNSAFE_PROPERTY_NAMES])('rejects direct string property name %s', (badName) => {
			expect(() => extend([], badName, [])).toThrowError(ExpressionExtensionError);
			expect(() => extend({}, badName, [])).toThrowError(ExpressionExtensionError);
			expect(() => extend('s', badName, [])).toThrowError(ExpressionExtensionError);
		});

		it.each([...UNSAFE_PROPERTY_NAMES])(
			'rejects name returned on first toString() call: %s',
			(badName) => {
				const k = { toString: () => badName };
				expect(() => extend([], k as unknown as string, [])).toThrowError(ExpressionExtensionError);
			},
		);
	});

	describe('legitimate behaviour preserved', () => {
		it('still resolves Array.first on real arrays', () => {
			expect(extend([10, 20, 30], 'first', [])).toBe(10);
		});

		it('still resolves String.toSnakeCase on real strings', () => {
			expect(extend('hello world', 'toSnakeCase', [])).toBe('hello_world');
		});

		it('still resolves the generic isEmpty extension', () => {
			expect(extend([], 'isEmpty', [])).toBe(true);
			expect(extend([1], 'isEmpty', [])).toBe(false);
		});
	});

	describe('single-evaluation of functionName', () => {
		// If a lookup branch re-coerced, the second toString() call would
		// return 'CHANGED_ON_SECOND_CALL' and miss the real `first` extension.
		it('resolves an extension once and does not re-coerce functionName along the lookup path', () => {
			const k = statefulName('CHANGED_ON_SECOND_CALL', 'first');

			const result = extend([1, 2, 3], k as unknown as string, []);

			expect(result).toBe(1);
			expect(k.calls()).toBe(1);
		});
	});
});
