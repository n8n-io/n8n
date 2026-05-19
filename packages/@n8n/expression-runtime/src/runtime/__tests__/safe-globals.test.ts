import { describe, it, expect } from 'vitest';
import { __sanitize, ExpressionError } from '../safe-globals';

describe('__sanitize', () => {
	it('throws for string keys in the unsafe-property set', () => {
		expect(() => __sanitize('constructor')).toThrow(ExpressionError);
		expect(() => __sanitize('__proto__')).toThrow(ExpressionError);
		expect(() => __sanitize('prototype')).toThrow(ExpressionError);
	});

	it('returns string keys unchanged when they are not in the unsafe-property set', () => {
		expect(__sanitize('foo')).toBe('foo');
		expect(__sanitize('')).toBe('');
		expect(__sanitize('0')).toBe('0');
	});

	it('coerces non-string values to a string before checking the unsafe-property set', () => {
		// An object whose `toString` returns a denied name must be rejected:
		// JavaScript invokes `toString` when the value is used as a property
		// key (`obj[value]`), so a check that only handles strings is incomplete.
		const coercingToConstructor = { toString: () => 'constructor' };
		expect(() => __sanitize(coercingToConstructor)).toThrow(ExpressionError);

		const coercingToProto = { toString: () => '__proto__' };
		expect(() => __sanitize(coercingToProto)).toThrow(ExpressionError);

		// `Symbol.toPrimitive` overrides `toString`; that path must also coerce.
		const coercingViaSymbolToPrimitive = {
			[Symbol.toPrimitive]: () => 'constructor',
			toString: () => 'safe',
		};
		expect(() => __sanitize(coercingViaSymbolToPrimitive)).toThrow(ExpressionError);
	});

	it('returns the coerced key string so the caller cannot re-trigger toString', () => {
		// If the function returned the original object, the property access
		// `obj[__sanitize(x)]` would call `x.toString()` a second time and
		// could resolve to a different string than the one we just checked.
		// Returning the already-coerced string locks the result.
		let calls = 0;
		const k = {
			toString: () => {
				calls += 1;
				return calls === 1 ? 'safe' : 'constructor';
			},
		};
		const sanitized = __sanitize(k);
		expect(typeof sanitized).toBe('string');
		expect(sanitized).toBe('safe');
		// Using the result as a property key must not invoke `k.toString` again.
		const probe: Record<string, number> = { safe: 1, constructor: 2 };
		expect(probe[sanitized as string]).toBe(1);
		expect(calls).toBe(1);
	});

	it('passes symbols through unchanged', () => {
		// `String(symbol)` throws, and symbol-keyed property access cannot
		// reach the string-valued unsafe-property set, so symbols are passed
		// through as-is.
		const s = Symbol('arbitrary');
		expect(__sanitize(s)).toBe(s);
	});

	it('coerces other primitives and returns the coerced string', () => {
		expect(__sanitize(42)).toBe('42');
		expect(__sanitize(null)).toBe('null');
		expect(__sanitize(undefined)).toBe('undefined');
		expect(__sanitize(true)).toBe('true');
	});
});
