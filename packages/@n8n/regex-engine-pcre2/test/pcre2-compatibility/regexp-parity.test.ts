import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	engine = createPcre2RegexEngine();
});

describe('exec parity with native RegExp', () => {
	const cases: Array<{ name: string; pattern: string; input: string; flags?: string }> = [
		{ name: '0 capture groups, match at position 0', pattern: 'foo', input: 'foobar' },
		{ name: '1 capture group, match in the middle', pattern: 'a(b+)c', input: 'xxabbbcxx' },
		{
			name: '3 capture groups, match at the end',
			pattern: '(\\d+)-(\\d+)-(\\d+)$',
			input: 'prefix 2024-01-31',
		},
		{ name: 'no match', pattern: 'zzz', input: 'abcdef' },
		{ name: '1 capture group, match at position 0', pattern: '(\\w+)@', input: 'user@example.com' },
		{ name: '3 capture groups, match in the middle', pattern: 'x(a)(b)(c)y', input: '__xabcy__' },
	];

	it.each(cases)('$name: $pattern on $input', ({ pattern, input, flags }) => {
		const nativeRegex = new RegExp(pattern, flags);
		const nativeResult = nativeRegex.exec(input);
		const engineResult = engine.exec(pattern, input, flags);

		if (nativeResult === null) {
			expect(engineResult).toBeNull();
			return;
		}

		expect(engineResult).not.toBeNull();
		expect(engineResult?.[0]).toBe(nativeResult[0]);
		expect(engineResult?.index).toBe(nativeResult.index);
		expect(engineResult?.input).toBe(nativeResult.input);
		for (let i = 1; i < nativeResult.length; i++) {
			if (nativeResult[i] === undefined) {
				continue;
			}
			expect(engineResult?.[i]).toBe(nativeResult[i]);
		}
	});
});

describe('matchAll parity with native RegExp', () => {
	it('multiple non-overlapping matches', () => {
		const pattern = '\\d+';
		const input = 'a1 b22 c333';
		const nativeMatches = [...input.matchAll(new RegExp(pattern, 'g'))];
		const engineMatches = engine.matchAll(pattern, input);

		expect(engineMatches.map((m) => m[0])).toEqual(nativeMatches.map((m) => m[0]));
		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it('zero matches', () => {
		const pattern = 'zzz';
		const input = 'abcdef';
		const nativeMatches = [...input.matchAll(new RegExp(pattern, 'g'))];
		const engineMatches = engine.matchAll(pattern, input);

		expect(engineMatches).toHaveLength(nativeMatches.length);
		expect(engineMatches).toEqual([]);
	});

	it('adjacent matches with no gap', () => {
		const pattern = '..';
		const input = 'abcdef';
		const nativeMatches = [...input.matchAll(new RegExp(pattern, 'g'))];
		const engineMatches = engine.matchAll(pattern, input);

		expect(engineMatches.map((m) => m[0])).toEqual(nativeMatches.map((m) => m[0]));
		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it('zero-length match possible at the start of the input', () => {
		const pattern = 'x*';
		const input = 'bbb';
		const nativeMatches = [...input.matchAll(new RegExp(pattern, 'g'))];
		const engineMatches = engine.matchAll(pattern, input);

		expect(engineMatches.length).toBeLessThan(100);
		expect(engineMatches.map((m) => m[0])).toEqual(nativeMatches.map((m) => m[0]));
		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it('zero-length match possible at the end of the input', () => {
		const pattern = 'z*';
		const input = 'aaz';
		const nativeMatches = [...input.matchAll(new RegExp(pattern, 'g'))];
		const engineMatches = engine.matchAll(pattern, input);

		expect(engineMatches.length).toBeLessThan(100);
		expect(engineMatches.map((m) => m[0])).toEqual(nativeMatches.map((m) => m[0]));
		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});
});

describe('split parity with native String.prototype.split', () => {
	it('splits on a simple literal pattern', () => {
		const pattern = ',';
		const input = 'a,b,c';
		const nativeResult = input.split(new RegExp(pattern));
		expect(engine.split(pattern, input)).toEqual(nativeResult);
	});

	it('splits with a capturing group in the separator (captured text spliced in)', () => {
		const pattern = '(,)';
		const input = 'a,b,c';
		const nativeResult = input.split(new RegExp(pattern));
		expect(engine.split(pattern, input)).toEqual(nativeResult);
	});

	it('returns the whole input as a single-element array when there is no separator match', () => {
		const pattern = ';';
		const input = 'abc';
		const nativeResult = input.split(new RegExp(pattern));
		expect(engine.split(pattern, input)).toEqual(nativeResult);
	});

	it('splits an empty input string', () => {
		const pattern = ',';
		const input = '';
		const nativeResult = input.split(new RegExp(pattern));
		expect(engine.split(pattern, input)).toEqual(nativeResult);
	});
});

describe('test parity with native RegExp (cases not already covered)', () => {
	it('anchored pattern matches at the start of the string', () => {
		const pattern = '^abc';
		const input = 'abcdef';
		expect(engine.test(pattern, input)).toBe(new RegExp(pattern).test(input));
	});

	it('anchored pattern matches at the end of the string', () => {
		const pattern = 'def$';
		const input = 'abcdef';
		expect(engine.test(pattern, input)).toBe(new RegExp(pattern).test(input));
	});

	it('anchored pattern fails when the anchor point does not match', () => {
		const pattern = '^def';
		const input = 'abcdef';
		expect(engine.test(pattern, input)).toBe(new RegExp(pattern).test(input));
	});

	it('multiline ^/$ behavior with the m flag across a 3-line string', () => {
		const pattern = '^line2$';
		const input = 'line1\nline2\nline3';
		const nativeWithoutM = new RegExp(pattern).test(input);
		const nativeWithM = new RegExp(pattern, 'm').test(input);

		expect(nativeWithoutM).toBe(false);
		expect(nativeWithM).toBe(true);
		expect(engine.test(pattern, input)).toBe(nativeWithoutM);
		expect(engine.test(pattern, input, 'm')).toBe(nativeWithM);
	});

	it('multiline ^ matches the start of each of the 3 lines with the m flag', () => {
		const pattern = '^line\\d';
		const input = 'line1\nline2\nline3';
		expect(engine.test(pattern, input, 'm')).toBe(new RegExp(pattern, 'm').test(input));
	});
});

describe('flags parity with native RegExp', () => {
	it('i flag: case-insensitive match on mixed-case pattern+input', () => {
		const pattern = 'HeLLo';
		const input = 'say hello world';
		const nativeMatch = input.match(new RegExp(pattern, 'i'));
		const engineResult = engine.exec(pattern, input, 'i');

		expect(nativeMatch).not.toBeNull();
		expect(engineResult).not.toBeNull();
		expect(engineResult?.[0]).toBe(nativeMatch?.[0]);
		expect(engineResult?.index).toBe(nativeMatch?.index);
	});

	it('s flag: without dotall, . does not match a newline', () => {
		const pattern = 'a.b';
		const input = 'a\nb';
		const nativeResult = new RegExp(pattern).test(input);
		expect(nativeResult).toBe(false);
		expect(engine.test(pattern, input)).toBe(nativeResult);
	});

	it('s flag: with dotall, . matches a newline', () => {
		const pattern = 'a.b';
		const input = 'a\nb';
		const nativeResult = new RegExp(pattern, 's').test(input);
		expect(nativeResult).toBe(true);
		expect(engine.test(pattern, input, 's')).toBe(nativeResult);
	});

	it('x flag: extended mode ignores whitespace and # comments in the pattern', () => {
		const extendedPattern = `
      \\d+  # the numeric part
      -
      \\d+  # the second numeric part
    `;
		const equivalentCompactPattern = '\\d+-\\d+';
		const input = 'id 123-456 done';

		const nativeMatch = input.match(new RegExp(equivalentCompactPattern));
		const engineResult = engine.exec(extendedPattern, input, 'x');

		expect(nativeMatch).not.toBeNull();
		expect(engineResult).not.toBeNull();
		expect(engineResult?.[0]).toBe(nativeMatch?.[0]);
		expect(engineResult?.index).toBe(nativeMatch?.index);
	});
});
