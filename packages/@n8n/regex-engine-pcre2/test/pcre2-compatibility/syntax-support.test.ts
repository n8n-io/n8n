import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	engine = createPcre2RegexEngine({ jsFlags: ['u'] });
});

describe('backreferences', () => {
	it('matches a repeated word via \\1', () => {
		expect(engine.test('(\\w+)\\s\\1', 'hello hello')).toBe(true);
	});

	it('does not match two different words', () => {
		expect(engine.test('(\\w+)\\s\\1', 'hello world')).toBe(false);
	});

	it('supports a numbered backreference to a non-first group', () => {
		expect(engine.test('(a)(b)\\2\\1', 'abba')).toBe(true);
	});
});

describe('lookahead', () => {
	it('positive lookahead: \\d+(?=px) matches the digits before "px"', () => {
		const result = engine.exec('\\d+(?=px)', '100px');
		expect(result).not.toBeNull();
		expect(result?.[0]).toBe('100');
	});

	it('positive lookahead: does not match when not followed by "px"', () => {
		expect(engine.test('\\d+(?=px)', '100em')).toBe(false);
	});

	it('negative lookahead: matches per native RegExp ground truth', () => {
		const native = /\d+(?!px)/.exec('100em');
		expect(native).not.toBeNull();

		const result = engine.exec('\\d+(?!px)', '100em');
		expect(result).not.toBeNull();
		expect(result?.[0]).toBe(native?.[0]);
	});

	it('negative lookahead: does not match "100" immediately followed by "px", but backtracks onto a shorter run that IS followed by "px" and is itself not-followed-by-px', () => {
		const native = /\d+(?!px)/.exec('100px');
		const result = engine.exec('\\d+(?!px)', '100px');

		if (native === null) {
			expect(result).toBeNull();
		} else {
			expect(result).not.toBeNull();
			expect(result?.[0]).toBe(native[0]);
		}
	});
});

describe('lookbehind', () => {
	it('positive lookbehind: (?<=\\$)\\d+ matches the digits after "$"', () => {
		const result = engine.exec('(?<=\\$)\\d+', '$100');
		expect(result).not.toBeNull();
		expect(result?.[0]).toBe('100');
	});

	it('negative lookbehind changes the match outcome vs. no lookbehind at all', () => {
		const input = '100 $100';

		const nativeWithout = /\b\d+\b/.exec(input);
		const nativeWith = /(?<!\$)\b\d+\b/.exec(input);

		const withoutLookbehind = engine.exec('\\b\\d+\\b', input);
		const withLookbehind = engine.exec('(?<!\\$)\\b\\d+\\b', input);

		expect(withoutLookbehind).not.toBeNull();
		expect(withoutLookbehind?.[0]).toBe(nativeWithout?.[0]);
		expect(withoutLookbehind?.index).toBe(nativeWithout?.index);

		expect(withLookbehind).not.toBeNull();
		expect(withLookbehind?.[0]).toBe(nativeWith?.[0]);
		expect(withLookbehind?.index).toBe(nativeWith?.index);

		expect(withLookbehind?.index).toBe(0);
	});
});

describe('possessive quantifiers (PCRE2 extension, not valid ECMAScript)', () => {
	it('matches via a possessive quantifier', () => {
		expect(engine.test('a++b', 'aaab')).toBe(true);
	});

	it('guard-rail: native RegExp really does reject this syntax in this Node version', () => {
		expect(() => new RegExp('a++b')).toThrow(SyntaxError);
	});
});

describe('atomic groups (PCRE2/PCRE-only extension, not valid ECMAScript)', () => {
	it('compiles and matches via an atomic group', () => {
		expect(engine.test('(?>a+)b', 'aaab')).toBe(true);
	});

	it('guard-rail: native RegExp really does reject this syntax in this Node version', () => {
		expect(() => new RegExp('(?>a+)b')).toThrow(SyntaxError);
	});
});

describe('Unicode property escapes (\\p{L})', () => {
	it('matches a run of Latin letters with diacritics', () => {
		const result = engine.exec('\\p{L}+', 'héllo', 'u');
		expect(result).not.toBeNull();
		expect(result?.[0]).toBe('héllo');
	});

	it('matches a run of CJK letters', () => {
		const result = engine.exec('\\p{L}+', '日本語', 'u');
		expect(result).not.toBeNull();
		expect(result?.[0]).toBe('日本語');
	});

	it('does not match a string of digits only', () => {
		expect(engine.test('^\\p{L}+$', '123', 'u')).toBe(false);
	});
});

describe('named capture groups', () => {
	it('compiles without throwing and test() returns true', () => {
		expect(() => engine.test('(?<year>\\d{4})-(?<month>\\d{2})', '2024-01')).not.toThrow();
		expect(engine.test('(?<year>\\d{4})-(?<month>\\d{2})', '2024-01')).toBe(true);
	});

	it('exec() returns a truthy result with positional groups populated', () => {
		const result = engine.exec('(?<year>\\d{4})-(?<month>\\d{2})', '2024-01');
		expect(result).toBeTruthy();
		expect(result?.[0]).toBe('2024-01');
		expect(result?.[1]).toBe('2024');
		expect(result?.[2]).toBe('01');
	});
});
