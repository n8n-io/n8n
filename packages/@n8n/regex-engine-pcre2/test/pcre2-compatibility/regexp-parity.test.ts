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

	// Zero-length matches: native split never attempts a match starting exactly at the end
	// of the string, so a pattern that can match empty everywhere still doesn't produce a
	// spurious trailing empty segment.
	it('does not produce a trailing empty segment for a pattern that matches empty everywhere', () => {
		const pattern = '(?:)';
		const input = 'ab';
		expect(engine.split(pattern, input)).toEqual(input.split(new RegExp(pattern)));
	});

	it('drops a trailing zero-length match at end-of-string but keeps interior ones', () => {
		const pattern = 'x*';
		const input = 'abc';
		expect(engine.split(pattern, input)).toEqual(input.split(new RegExp(pattern)));
	});

	it('an empty subject matched by the pattern yields an empty array', () => {
		const pattern = '(?:)';
		const input = '';
		expect(engine.split(pattern, input)).toEqual(input.split(new RegExp(pattern)));
	});

	it('an empty subject not matched by the pattern yields a single empty-string element', () => {
		const pattern = 'x';
		const input = '';
		expect(engine.split(pattern, input)).toEqual(input.split(new RegExp(pattern)));
	});

	it('a non-empty match ending exactly at the end of the string still splits (trailing empty kept)', () => {
		const pattern = 'c$';
		const input = 'abc';
		expect(engine.split(pattern, input)).toEqual(input.split(new RegExp(pattern)));
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

// Offsets come out of PCRE2 as UTF-16 code-unit indices (the 16-bit library), so they
// are directly comparable with a native RegExp's `.index` on the same non-ASCII subject.
describe('offset parity with native RegExp on non-ASCII subjects', () => {
	const subjects: Array<{ name: string; input: string }> = [
		{ name: 'accented Latin', input: 'café crème brûlée' },
		{ name: 'CJK', input: '日本語のテキストです' },
		{ name: 'astral (emoji)', input: '😀 party 🎉 time 😀' },
		{ name: 'mixed scripts and astral', input: 'aé日😀b' },
	];

	it.each(subjects)('exec().index matches native RegExp for $name', ({ input }) => {
		const pattern = '\\w+$';
		const nativeResult = new RegExp(pattern).exec(input);
		const engineResult = engine.exec(pattern, input);

		expect(engineResult?.index).toBe(nativeResult?.index);
		expect(engineResult?.[0]).toBe(nativeResult?.[0]);
	});

	it.each(subjects)('matchAll() indices match native RegExp for $name', ({ input }) => {
		const pattern = '\\S+';
		const nativeMatches = [...input.matchAll(new RegExp(pattern, 'g'))];
		const engineMatches = engine.matchAll(pattern, input);

		expect(engineMatches.map((m) => m[0])).toEqual(nativeMatches.map((m) => m[0]));
		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it.each(subjects)('split() matches native String.prototype.split for $name', ({ input }) => {
		const pattern = '.';
		expect(engine.split(pattern, input, 's')).toEqual(input.split(new RegExp(pattern, 's')));
	});

	it('exec().index is correct for a match sitting after a multi-byte character', () => {
		// 'é' and '日' are 2- and 3-byte in UTF-8 but 1 UTF-16 code unit each; '😀' is 2.
		const input = 'é日😀TARGET';
		const engineResult = engine.exec('TARGET', input);

		expect(engineResult?.index).toBe(4);
		expect(input.slice(engineResult?.index)).toBe('TARGET');
	});

	it('replace() on a non-ASCII subject matches native String.prototype.replace', () => {
		const globalEngine = createPcre2RegexEngine({ jsFlags: ['g'] });
		const input = 'café 日本 😀 café';

		expect(globalEngine.replace('café', input, 'g', 'tea')).toBe(input.replace(/café/g, 'tea'));
		expect(globalEngine.replace('(\\S+) (\\S+)', input, '', '$2 $1')).toBe(
			input.replace(/(\S+) (\S+)/, '$2 $1'),
		);
	});

	it('a zero-width match after a non-ASCII character does not error', () => {
		const input = 'é日😀';
		const engineMatches = engine.matchAll('(?=.)', input, 's');
		const nativeMatches = [...input.matchAll(/(?=.)/gs)];

		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it('matchAll() does not drop trailing matches on a non-ASCII subject', () => {
		// The byte length of this subject far exceeds its UTF-16 length, which is what
		// previously truncated the loop once the cursor passed input.length.
		const input = '日本語 '.repeat(20) + 'END';
		const engineMatches = engine.matchAll('\\S+', input);

		expect(engineMatches).toHaveLength(21);
		expect(engineMatches.at(-1)?.[0]).toBe('END');
		expect(engineMatches.at(-1)?.index).toBe(input.lastIndexOf('END'));
	});
});

describe('the u flag selects code-point rather than code-unit semantics', () => {
	it('makes "." consume a whole astral character, as native RegExp does', () => {
		const unicodeEngine = createPcre2RegexEngine({ jsFlags: ['u'] });
		const input = '😀x';

		expect(unicodeEngine.exec('.', input, 'u')?.[0]).toBe(/./u.exec(input)?.[0]);
		expect(unicodeEngine.exec('.', input)?.[0]).toBe(/./.exec(input)?.[0]);
	});

	it('reports the same index with and without the flag for a BMP-only subject', () => {
		const unicodeEngine = createPcre2RegexEngine({ jsFlags: ['u'] });
		const input = 'café TARGET';

		expect(unicodeEngine.exec('TARGET', input, 'u')?.index).toBe(5);
		expect(unicodeEngine.exec('TARGET', input)?.index).toBe(5);
	});

	it('reports a UTF-16 index for a match after an astral character under the flag', () => {
		const unicodeEngine = createPcre2RegexEngine({ jsFlags: ['u'] });
		const input = '😀TARGET';

		expect(unicodeEngine.exec('TARGET', input, 'u')?.index).toBe(2);
		expect(/TARGET/u.exec(input)?.index).toBe(2);
	});
});

// A matchAll/replace/split loop skips PCRE2's per-call UTF re-validation after its first
// call (PCRE2_NO_UTF_CHECK), which makes an offset that lands mid-surrogate-pair undefined
// behaviour rather than a caught error -- these guard the zero-length-match advancement
// (nextOffset) that's responsible for never producing such an offset.
describe('zero-length matches stay code-point aligned under the u flag', () => {
	let unicodeEngine: RegexEngine;
	let globalUnicodeEngine: RegexEngine;

	beforeAll(() => {
		unicodeEngine = createPcre2RegexEngine({ jsFlags: ['u'] });
		globalUnicodeEngine = createPcre2RegexEngine({ jsFlags: ['g', 'u'] });
	});

	it('matchAll of an empty-matching pattern lands once per code point, not per code unit', () => {
		const input = '😀😀x';
		const nativeMatches = [...input.matchAll(/(?:)/gu)];
		const engineMatches = globalUnicodeEngine.matchAll('(?:)', input, 'ug');

		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
		expect(engineMatches).toHaveLength(nativeMatches.length);
	});

	it('matchAll of an empty-matching pattern around interleaved astral and BMP characters', () => {
		const input = 'a😀b🎉😀c';
		const nativeMatches = [...input.matchAll(/(?:)/gu)];
		const engineMatches = globalUnicodeEngine.matchAll('(?:)', input, 'ug');

		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it('split on a zero-length lookahead keeps astral characters intact', () => {
		// Not `(?:)`: that matches at the very end of the string too, which hits a
		// separate, pre-existing (non-unicode) split bug unrelated to this fix -- a
		// zero-length match landing exactly at end-of-string produces a spurious
		// trailing ''. `(?=😀)` never matches there, so it stays clear of it.
		const input = '😀a😀b';
		const nativeResult = input.split(/(?=😀)/u);
		expect(unicodeEngine.split('(?=😀)', input, 'u')).toEqual(nativeResult);
	});

	it('matchAll over a pattern that can match empty or one char, across astral input', () => {
		const input = '😀ab😀';
		const nativeMatches = [...input.matchAll(/a?/gu)];
		const engineMatches = globalUnicodeEngine.matchAll('a?', input, 'ug');

		expect(engineMatches.map((m) => m[0])).toEqual(nativeMatches.map((m) => m[0]));
		expect(engineMatches.map((m) => m.index)).toEqual(nativeMatches.map((m) => m.index));
	});

	it('matchAll on a lone surrogate throws consistently, not just on the first call', () => {
		const input = 'a\uD800b\uD800c';
		expect(() => globalUnicodeEngine.matchAll('.', input, 'ug')).toThrow();
	});
});

// PCRE2_NO_UTF_CHECK removes the O(matches x subject length) UTF re-validation cost a
// matchAll/replace/split loop previously paid on every call; this is a coarse smoke test
// that scaling stays close to linear, not a precise benchmark.
describe('matchAll scaling under the u flag stays roughly linear', () => {
	it('does not blow up superlinearly as match count and subject length grow together', () => {
		const engine = createPcre2RegexEngine({ jsFlags: ['g', 'u'] });
		const timeFor = (repeats: number): number => {
			const input = '😀'.repeat(repeats);
			const start = performance.now();
			engine.matchAll('😀', input, 'ug');
			return performance.now() - start;
		};

		timeFor(200); // warm up the handle cache before timing
		const small = timeFor(2000);
		const large = timeFor(16000); // 8x the matches, 8x the subject length

		// Linear cost would scale ~8x; O(n^2) marshalling/re-validation would scale ~64x.
		// A generous ratio distinguishes the two without being a flaky exact-timing assertion.
		expect(large / Math.max(small, 0.01)).toBeLessThan(24);
	});
});

describe('unset capture groups', () => {
	it('pads a trailing group that never participated, like native RegExp', () => {
		const pattern = '(a)(x)?';
		const nativeResult = /(a)(x)?/.exec('a');
		const engineResult = engine.exec(pattern, 'a');

		expect(engineResult).toHaveLength(nativeResult?.length as number);
		expect(Array.from(engineResult ?? [])).toEqual(Array.from(nativeResult ?? []));
		expect(engineResult?.[2]).toBeUndefined();
	});

	it('pads several trailing unset groups', () => {
		const engineResult = engine.exec('(a)(x)?(y)?(z)?', 'a');

		expect(engineResult).toHaveLength(5);
		expect(Array.from(engineResult ?? [])).toEqual(['a', 'a', undefined, undefined, undefined]);
	});

	it('reports a trailing unset NAMED group as undefined in .groups', () => {
		const engineResult = engine.exec('(?<first>a)(?<second>x)?', 'a');

		expect(engineResult).toHaveLength(3);
		expect(engineResult?.groups).toEqual({ first: 'a', second: undefined });
		expect(engineResult?.groups && 'second' in engineResult.groups).toBe(true);
	});

	it('still distinguishes an unset group from one that matched empty text', () => {
		const engineResult = engine.exec('(a)(x?)(y)?', 'a');

		expect(Array.from(engineResult ?? [])).toEqual(['a', 'a', '', undefined]);
	});
});

// 'y' has no PCRE2 compile-option equivalent (it's the runtime-only PCRE2_ANCHORED),
// so it needs its own opted-in engine, like the 'u'/unicode block above.
describe('sticky (y) flag parity with native RegExp', () => {
	let stickyEngine: RegexEngine;

	beforeAll(() => {
		stickyEngine = createPcre2RegexEngine({ jsFlags: ['y'] });
	});

	it('matches only when the pattern starts exactly at the beginning', () => {
		expect(stickyEngine.test('foo', 'foobar', 'y')).toBe(/foo/y.test('foobar'));
		expect(stickyEngine.test('bar', 'foobar', 'y')).toBe(/bar/y.test('foobar'));
	});

	it('exec matches identically to native RegExp under y', () => {
		const engineResult = stickyEngine.exec('foo', 'foobar', 'y');
		const nativeResult = /foo/y.exec('foobar');

		expect(engineResult?.[0]).toBe(nativeResult?.[0]);
		expect(engineResult?.index).toBe(nativeResult?.index);
	});

	it('a plain (non-anchored) match at the same position still succeeds', () => {
		expect(stickyEngine.test('foo', 'foobar')).toBe(true);
	});

	it('matchAll under g+y stops at the first non-adjacent match, like native RegExp', () => {
		const globalStickyEngine = createPcre2RegexEngine({ jsFlags: ['g', 'y'] });
		const engineResult = globalStickyEngine.matchAll('a', 'aaXaa', 'gy');
		const nativeResult = Array.from('aaXaa'.matchAll(/a/gy));

		expect(engineResult.map((m) => m[0])).toEqual(nativeResult.map((m) => m[0]));
		expect(engineResult).toHaveLength(2);
	});

	it('is rejected by an engine that did not opt in via jsFlags', () => {
		expect(() => engine.test('foo', 'foobar', 'y')).toThrow(/Unsupported regex flag/);
	});
});
