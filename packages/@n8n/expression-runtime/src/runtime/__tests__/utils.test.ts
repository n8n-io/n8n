import { describe, it, expect } from 'vitest';

import { isKeyOf } from '../utils';

describe('isKeyOf', () => {
	const registry = { first: 'getNodeFirst', last: 'getNodeLast', all: 'getNodeAll' } as const;

	it('returns true for own string keys', () => {
		expect(isKeyOf(registry, 'first')).toBe(true);
		expect(isKeyOf(registry, 'last')).toBe(true);
		expect(isKeyOf(registry, 'all')).toBe(true);
	});

	it('returns false for prototype-chain keys (toString, constructor, ...)', () => {
		// Critical: `in` would return true here because these live on
		// `Object.prototype`. `Object.hasOwn` correctly rejects them.
		expect(isKeyOf(registry, 'toString')).toBe(false);
		expect(isKeyOf(registry, 'constructor')).toBe(false);
		expect(isKeyOf(registry, 'hasOwnProperty')).toBe(false);
		expect(isKeyOf(registry, '__proto__')).toBe(false);
		expect(isKeyOf(registry, 'valueOf')).toBe(false);
	});

	it('returns false for own keys that are not in the registry', () => {
		expect(isKeyOf(registry, 'unknown')).toBe(false);
	});

	it('returns false for symbol keys', () => {
		expect(isKeyOf(registry, Symbol.iterator)).toBe(false);
		expect(isKeyOf(registry, Symbol('arbitrary'))).toBe(false);
	});
});
