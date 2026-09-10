import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	Pcre2BudgetExceededError,
	Pcre2CompileError,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	await initPcre2Engine();
	engine = createPcre2RegexEngine({ jsFlags: ['g'] });
});

describe('test', () => {
	it('returns true for a matching pattern', () => {
		expect(engine.test('a+b', 'xxaaabxx')).toBe(true);
	});

	it('returns false for a non-matching pattern', () => {
		expect(engine.test('a+b', 'xxxxx')).toBe(false);
	});

	it('respects flags (case-insensitive)', () => {
		expect(engine.test('abc', 'ABC', 'i')).toBe(true);
		expect(engine.test('abc', 'ABC')).toBe(false);
	});
});

describe('exec', () => {
	it('returns null on no match', () => {
		expect(engine.exec('a+b', 'xxxxx')).toBeNull();
	});

	it('reports the whole match and capture groups', () => {
		const result = engine.exec('(a+)(b)', 'xxaaabxx');
		expect(result).not.toBeNull();
		expect(result?.[0]).toBe('aaab');
		expect(result?.[1]).toBe('aaa');
		expect(result?.[2]).toBe('b');
		expect(result?.input).toBe('xxaaabxx');
	});

	it('reports the real match start offset in .index, not 0', () => {
		const result = engine.exec('a+b', 'xxaaabxx');
		expect(result).not.toBeNull();
		expect(result?.index).toBe(2);
	});

	it('reports a non-zero index for a match starting well past the beginning', () => {
		const result = engine.exec('needle', 'haystack haystack haystack needle');
		expect(result).not.toBeNull();
		expect(result?.index).toBe(27);
	});

	it('populates .groups for named capture groups, matching native RegExp', () => {
		const pattern = '(?<year>\\d{4})-(?<month>\\d{2})';
		const input = '2026-09';
		expect(engine.exec(pattern, input)?.groups).toEqual(new RegExp(pattern).exec(input)?.groups);
	});

	it('.groups is undefined when the pattern has no named groups', () => {
		expect(engine.exec('(a+)(b)', 'aaab')?.groups).toBeUndefined();
	});

	it('a named group that did not participate is undefined in .groups, matching native RegExp', () => {
		const pattern = '(?<a>a)|(?<b>b)';
		expect(engine.exec(pattern, 'a')?.groups).toEqual(new RegExp(pattern).exec('a')?.groups);
		expect(engine.exec(pattern, 'a')?.groups?.b).toBeUndefined();
	});
});

describe('replace', () => {
	it('replaces only the first match without the g flag', () => {
		expect(engine.replace('a', 'banana', '', 'X')).toBe('bXnana');
	});

	it('replaces every match with the g flag', () => {
		expect(engine.replace('a', 'banana', 'g', 'X')).toBe('bXnXnX');
	});

	it('replaces at the real match position, not the first textual occurrence of the matched text', () => {
		expect(engine.replace('ab$', 'ab-then-ab', '', 'X')).toBe('ab-then-X');
	});

	it('supports $& and $1/$2 in the replacement string', () => {
		expect(engine.replace('(\\d+)-(\\d+)', 'id 12-34 done', '', '[$2/$1 was $&]')).toBe(
			'id [34/12 was 12-34] done',
		);
	});

	it('supports $$ as a literal dollar sign', () => {
		expect(engine.replace('a', 'a', '', '$$')).toBe('$');
	});
});

describe('matchAll', () => {
	it('returns every match with correct offsets', () => {
		const results = engine.matchAll('a+', 'a aa aaa');
		expect(results.map((r) => r[0])).toEqual(['a', 'aa', 'aaa']);
		expect(results.map((r) => r.index)).toEqual([0, 2, 5]);
	});

	it('returns an empty array when there is no match', () => {
		expect(engine.matchAll('z+', 'aaa')).toEqual([]);
	});

	it('does not infinite-loop on a pattern that can match an empty string', () => {
		const results = engine.matchAll('a*', 'aab');
		const native = [...'aab'.matchAll(/a*/g)].map((m) => m[0]);
		expect(results.map((r) => r[0])).toEqual(native);
		expect(results.map((r) => r.index)).toEqual([0, 2, 3]);
	});
});

describe('split', () => {
	it('splits on every match, not just the first', () => {
		expect(engine.split(',', 'a,b,c')).toEqual(['a', 'b', 'c']);
	});

	it('splits on every match regardless of the g flag', () => {
		expect(engine.split(',', 'a,b,c', '')).toEqual(engine.split(',', 'a,b,c', 'g'));
	});

	it('includes capture groups from the separator', () => {
		expect(engine.split('(,)', 'a,b')).toEqual(['a', ',', 'b']);
	});

	it('returns the whole string when there is no match', () => {
		expect(engine.split(',', 'abc')).toEqual(['abc']);
	});
});

describe('compile failure', () => {
	it('throws a Pcre2CompileError for an invalid pattern', () => {
		expect(() => engine.test('(', 'anything')).toThrow(Pcre2CompileError);
	});

	it('includes a PCRE2 error message on the thrown error', () => {
		try {
			engine.test('(', 'anything');
			expect.unreachable('expected engine.test to throw');
		} catch (error) {
			expect(error).toBeInstanceOf(Pcre2CompileError);
			expect((error as Pcre2CompileError).message.length).toBeGreaterThan(0);
		}
	});
});

describe('match-limit budget', () => {
	it('rejects a pathological pattern instead of hanging', () => {
		const pathological = '(a+)+$';
		const input = 'a'.repeat(35) + '!';
		expect(() => engine.test(pathological, input)).toThrow(Pcre2BudgetExceededError);
	});

	const pathological = '(a+)+$';
	const input = 'a'.repeat(35) + '!';

	it('rejects via exec()', () => {
		expect(() => engine.exec(pathological, input)).toThrow(Pcre2BudgetExceededError);
	});

	it('rejects via replace()', () => {
		expect(() => engine.replace(pathological, input, '', 'X')).toThrow(Pcre2BudgetExceededError);
	});

	it('rejects via replace() with the global flag (the Symbol.replace looping path)', () => {
		expect(() => engine.replace(pathological, input, 'g', 'X')).toThrow(Pcre2BudgetExceededError);
	});

	it('rejects via matchAll()', () => {
		expect(() => engine.matchAll(pathological, input)).toThrow(Pcre2BudgetExceededError);
	});

	it('rejects via split()', () => {
		expect(() => engine.split(pathological, input)).toThrow(Pcre2BudgetExceededError);
	});
});

describe('deeply nested groups', () => {
	it("rejects nesting past PCRE2's parens_nest_limit with a typed Pcre2CompileError", () => {
		let deeplyNested = '(a)';
		for (let i = 0; i < 300; i++) deeplyNested = `(?:${deeplyNested})?`;
		expect(() => engine.test(deeplyNested, 'a')).toThrow(Pcre2CompileError);
	});
});

describe('replace() delegation does not use native RegExp for matching', () => {
	it('handles a PCRE2 possessive quantifier that native RegExp syntax does not support', () => {
		expect(engine.replace('a++b', 'xxaaabxx', '', 'Y')).toBe('xxYxx');
	});

	it('applies the PCRE2 step budget inside a global replace, not just single-match replace', () => {
		expect(() => engine.replace('(a+)+$', 'a'.repeat(35) + '!', 'g', 'X')).toThrow(
			Pcre2BudgetExceededError,
		);
	});
});

describe('handle caching', () => {
	it('reuses a compiled handle across repeated calls with the same pattern+flags', () => {
		for (let i = 0; i < 50; i++) {
			expect(engine.test('a+b', 'xxaaabxx')).toBe(true);
		}
	});
});
