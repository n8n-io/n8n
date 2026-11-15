import { describe, it, expect } from 'vitest';
import { __sanitize, ExpressionError } from '../safe-globals';

describe('__sanitize', () => {
	it('throws an ExpressionError for denied property names', () => {
		expect(() => __sanitize('constructor')).toThrow(ExpressionError);
		expect(() => __sanitize('__proto__')).toThrow(ExpressionError);
		expect(() => __sanitize('prototype')).toThrow(ExpressionError);
	});

	it('returns allowed string keys unchanged', () => {
		expect(__sanitize('foo')).toBe('foo');
		expect(__sanitize('')).toBe('');
		expect(__sanitize('0')).toBe('0');
	});

	it.each([
		'toString',
		'valueOf',
		'toLocaleString',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
	])('allows %s, which can be a field name in workflow data', (key) => {
		expect(__sanitize(key)).toBe(key);
	});

	it('throws for every name in the transform-time denylist', () => {
		// These names are rejected for static and literal keys at transform time;
		// keys built at runtime must be rejected here as well.
		const deniedNames = [
			'caller',
			'callee',
			'arguments',
			'getPrototypeOf',
			'setPrototypeOf',
			'getOwnPropertyDescriptor',
			'getOwnPropertyDescriptors',
			'defineProperty',
			'defineProperties',
			'mainModule',
			'binding',
			'_linkedBinding',
			'_load',
			'prepareStackTrace',
			'getBuiltinModule',
			'dlopen',
			'execve',
			'loadEnvFile',
		];
		for (const name of deniedNames) {
			expect(() => __sanitize(name)).toThrow(ExpressionError);
		}
	});

	it('coerces object values via toString before the denylist check', () => {
		// JavaScript invokes `toString` when an object is used as a property key,
		// so the denylist check must operate on the coerced string, not the raw value.
		const coercingToConstructor = { toString: () => 'constructor' };
		expect(() => __sanitize(coercingToConstructor)).toThrow(ExpressionError);

		const coercingToProto = { toString: () => '__proto__' };
		expect(() => __sanitize(coercingToProto)).toThrow(ExpressionError);

		const coercingToCaller = { toString: () => 'caller' };
		expect(() => __sanitize(coercingToCaller)).toThrow(ExpressionError);

		// `Symbol.toPrimitive` overrides `toString`; that path must also coerce.
		const coercingViaSymbolToPrimitive = {
			[Symbol.toPrimitive]: () => 'constructor',
			toString: () => 'safe',
		};
		expect(() => __sanitize(coercingViaSymbolToPrimitive)).toThrow(ExpressionError);
	});

	it('returns the coerced string so subsequent property access uses the validated value', () => {
		// Returning the already-coerced string ensures that `obj[__sanitize(x)]`
		// uses exactly the string that was checked, not a second toString() call.
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
		// `String(symbol)` throws, and symbol keys are outside the string denylist,
		// so symbols are returned as-is.
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
