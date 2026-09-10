import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	engine = createPcre2RegexEngine({ jsFlags: ['g'] });
});

describe('$& — whole match', () => {
	it('substitutes the whole match amid literal text', () => {
		const pattern = '\\d+';
		const input = 'value: 42 end';
		const replacement = 'before[$&]after';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('value: before[42]after end');
	});
});

describe('$$ — literal dollar sign', () => {
	it('substitutes a literal $', () => {
		expect(engine.replace('a', 'a', '', '$$')).toBe('$');
	});

	it('treats $$ followed by a digit as literal "$" + literal "1", not $$1 group syntax', () => {
		const pattern = '(a)';
		const input = 'a';
		const replacement = '$$1';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('$1');
	});
});

describe('$1-$3 — capture groups', () => {
	it('substitutes three independent capture groups correctly', () => {
		const pattern = '(\\w+)-(\\w+)-(\\w+)';
		const input = 'foo-bar-baz';
		const replacement = '$3/$2/$1';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('baz/bar/foo');
	});
});

describe('$N referencing a non-existent group', () => {
	it('leaves $5 as literal text when the pattern only has 2 groups', () => {
		const pattern = '(\\w+)-(\\w+)';
		const input = 'foo-bar';
		const replacement = '[$1|$2|$5]';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('[foo|bar|$5]');
	});

	it('leaves two-digit $15 as literal text when the pattern has no such group', () => {
		const pattern = '(\\w+)-(\\w+)';
		const input = 'foo-bar';
		const replacement = '[$1|$15]';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('[foo|foo5]');
	});

	it('leaves $9 as literal text when no group 9 exists', () => {
		const pattern = '(\\w+)-(\\w+)';
		const input = 'foo-bar';
		const replacement = '[$9]';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('[$9]');
	});
});

describe('$` — portion of the string before the match', () => {
	it('substitutes the pre-match portion', () => {
		const pattern = '\\d+';
		const input = 'hello 42 world';
		const replacement = '<$`>';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('hello <hello > world');
	});
});

describe("$' — portion of the string after the match", () => {
	it('substitutes the post-match portion', () => {
		const pattern = '\\d+';
		const input = 'hello 42 world';
		const replacement = "<$'>";
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe('hello < world> world');
	});
});

describe('combined substitution patterns', () => {
	it("resolves $`, $1, $', and $$ together in a single replacement string", () => {
		const pattern = '(\\w+)@(\\w+)';
		const input = 'contact: name@host in text';
		const replacement = "[$`]{$1}[$']$$done";
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
	});
});

describe('global replace resolves each match independently', () => {
	it("uses each match's own groups, not the first match's", () => {
		const pattern = '(\\w)(\\d)';
		const input = 'a1 b2 c3';
		const replacement = '$2$1';
		const expected = input.replace(new RegExp(pattern, 'g'), replacement);
		expect(engine.replace(pattern, input, 'g', replacement)).toBe(expected);
		expect(expected).toBe('1a 2b 3c');
	});
});

describe('$<name> — named capture groups', () => {
	it('substitutes the named group, matching native RegExp', () => {
		const pattern = '(?<word>\\w+)';
		const input = 'hello';
		const replacement = '$<word>!';
		const result = engine.replace(pattern, input, '', replacement);
		const nativeResult = input.replace(new RegExp(pattern), replacement);
		expect(nativeResult).toBe('hello!');
		expect(result).toBe(nativeResult);
	});
});

describe('no match at all', () => {
	it('returns the input unchanged, never touching $-syntax in the replacement', () => {
		const pattern = 'zzz';
		const input = 'hello world';
		const replacement = '$&$1$$';
		const expected = input.replace(new RegExp(pattern), replacement);
		expect(engine.replace(pattern, input, '', replacement)).toBe(expected);
		expect(expected).toBe(input);
	});
});
