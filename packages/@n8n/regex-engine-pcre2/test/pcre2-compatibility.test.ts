import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import createPcre2WrapperModule from '../src/generated/pcre2_wrapper.js';
import { releaseSubject, runMatch } from '../src/match.js';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	Pcre2BudgetExceededError,
	Pcre2CompileError,
	type RegexEngine,
} from '../src/pcre2-engine.js';
import { invalidatedHandles } from '../src/wasm-module.js';

describe('corpus', () => {
	type PackedResult = null | [string, ...(string | null)[]];

	interface CorpusCase {
		pattern: string;
		flags: string;
		input: string;
		esAgree: 0 | 1;
		expected: PackedResult;
	}

	type CorpusCaseTuple = [
		CorpusCase['pattern'],
		CorpusCase['flags'],
		string | number,
		CorpusCase['esAgree'],
		CorpusCase['expected'],
	];
	type CorpusFile = CorpusCaseTuple[] | { subjects: string[]; cases: CorpusCaseTuple[] };

	const FIXTURES_DIR = path.join(__dirname, 'fixtures/corpus');
	const RUST_REGEX_DIR = path.join(FIXTURES_DIR, 'rust-regex');

	function loadCategory(file: string): CorpusCase[] {
		const parsed: CorpusFile = JSON.parse(fs.readFileSync(file, 'utf8'));
		const tuples = Array.isArray(parsed) ? parsed : parsed.cases;
		const subjects = Array.isArray(parsed) ? [] : parsed.subjects;
		return tuples.map(([pattern, flags, input, esAgree, expected]) => ({
			pattern,
			flags,
			input: typeof input === 'number' ? (subjects[input] as string) : input,
			esAgree,
			expected,
		}));
	}

	const categoryFiles = [
		...fs
			.readdirSync(FIXTURES_DIR)
			.filter((f) => f.endsWith('.json'))
			.map((f) => ({ category: f.replace(/\.json$/, ''), file: path.join(FIXTURES_DIR, f) })),
		...fs
			.readdirSync(RUST_REGEX_DIR)
			.filter((f) => f.endsWith('.json'))
			.map((f) => ({ category: f.replace(/\.json$/, ''), file: path.join(RUST_REGEX_DIR, f) })),
	];

	let engine: RegexEngine;

	beforeAll(async () => {
		await initPcre2Engine();
		engine = createPcre2RegexEngine({
			compileOptions: ['altBsux', 'matchUnsetBackref'],
			jsFlags: ['g', 'u'],
		});
	});

	for (const { category, file } of categoryFiles) {
		describe(`corpus: ${category}`, () => {
			const cases = loadCategory(file);

			it(`has cases (sanity check the fixture file isn't empty)`, () => {
				expect(cases.length).toBeGreaterThan(0);
			});

			for (const [index, c] of cases.entries()) {
				const validity = c.esAgree ? 'es-pcre2-agree' : 'pcre2-only';
				it(`[${validity}] ${category}#${index}: /${c.pattern}/${c.flags} on ${JSON.stringify(c.input)}`, () => {
					const result = engine.exec(c.pattern, c.input, c.flags);
					if (c.expected === null) {
						expect(result).toBeNull();
						return;
					}
					const [whole, ...expectedGroups] = c.expected;
					expect(result).not.toBeNull();
					expect(result?.[0]).toBe(whole);
					for (let i = 0; i < expectedGroups.length; i++) {
						const expectedGroup = expectedGroups[i];
						if (expectedGroup === null) {
							expect(result?.[i + 1]).toBeUndefined();
							continue;
						}
						expect(result?.[i + 1]).toBe(expectedGroup);
					}
				});
			}
		});
	}
});

describe('real corpus samples', () => {
	let engine: RegexEngine;

	beforeAll(async () => {
		await initPcre2Engine();
		engine = createPcre2RegexEngine({ jsFlags: ['g', 'u'] });
	});

	describe('real corpus sample: flag:g — /\\s+/g (304 occurrences, the single most common pattern)', () => {
		it('collapses whitespace runs the same way native does', () => {
			const input = 'Some    text\twith\n\nirregular   whitespace   runs.';
			expect(engine.replace('\\s+', input, 'g', ' ')).toBe(input.replace(/\s+/g, ' '));
		});
	});

	describe('real corpus sample: lookbehind — /(?<=v=)[^&]+/ (9 occurrences, URL query-param extraction)', () => {
		it('extracts the value of a v= query parameter', () => {
			const input = 'https://example.com/watch?v=dQw4w9WgXcQ&list=abc';
			const native = /(?<=v=)[^&]+/.exec(input);
			const ours = engine.exec('(?<=v=)[^&]+', input);
			expect(ours?.[0]).toBe(native?.[0]);
			expect(ours?.[0]).toBe('dQw4w9WgXcQ');
		});
	});

	describe('real corpus sample: flag:u — /\\p{L}/u (4 occurrences, letter detection)', () => {
		it('matches a letter the same way native Unicode-aware RegExp does', () => {
			for (const ch of ['a', 'é', '日', '1', ' ', '_']) {
				const native = /\p{L}/u.test(ch);
				expect(engine.test('\\p{L}', ch, 'u')).toBe(native);
			}
		});
	});

	describe('real corpus sample: unicodePropertyLongForm — /\\p{Diacritic}/gu (3 occurrences)', () => {
		it('\\p{Diacritic} (a long-form binary property) compiles and matches correctly', () => {
			expect(engine.test('\\p{Diacritic}', '́', 'gu')).toBe(true);
			expect(engine.test('\\p{Diacritic}', 'a', 'gu')).toBe(false);
		});

		it('\\p{Letter} (long-form general-category alias) is rejected, unlike \\p{L}', () => {
			expect(engine.test('\\p{L}', 'a', 'u')).toBe(true);
			let longFormCompiles = true;
			try {
				engine.test('\\p{Letter}', 'a', 'u');
			} catch {
				longFormCompiles = false;
			}
			expect(/\p{Letter}/u.test('a')).toBe(true);
			expect(longFormCompiles).toBe(false);
		});
	});

	describe('real corpus sample: unpairedSurrogateInPattern — emoji-containing patterns (2 real examples)', () => {
		it('a target-emoji pattern compiles and matches (not actually an unpaired-surrogate problem)', () => {
			const pattern = '🎯.*?confident';
			const input = 'summary 🎯 I am fairly confident about this';
			expect(() => engine.test(pattern, input, 's')).not.toThrow();
			expect(engine.test(pattern, input, 's')).toBe(true);
			expect(engine.test(pattern, 'no emoji here', 's')).toBe(false);
		});

		it('a books-emoji pattern with a capture group compiles and extracts correctly', () => {
			const pattern = '(📚.*?Sources:.*?)(?:\\nAutomated|$)';
			const input = '📚 References Sources: see attached\nAutomated note follows';
			const result = engine.exec(pattern, input, 's');
			expect(result?.[1]).toBe('📚 References Sources: see attached');
		});
	});
});

describe('engine api', () => {
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

		// A cached handle releases its native subject buffer at the end of every operation
		// (test/exec/matchAll/replace/split) so it doesn't sit retained for as long as the
		// handle stays cached. Repeating the exact same input across separate operations must
		// still match correctly afterwards -- this would silently break if the JS-side
		// same-subject memoization thought a subject was still set natively after it was cleared.
		it('matches correctly on a repeated operation against the same input after release', () => {
			const input = 'xxaaabxx';
			for (let i = 0; i < 5; i++) {
				expect(engine.test('a+b', input)).toBe(true);
				expect(engine.exec('a+b', input)?.[0]).toBe('aaab');
				expect(engine.matchAll('a+', input).map((m) => m[0])).toEqual(['aaa']);
				expect(engine.replace('a+', input, '', 'X')).toBe('xxXbxx');
				expect(engine.split('x+', input)).toEqual(['', 'aaab', '']);
			}
		});
	});

	// The native match/depth/heap limits bound one pcre2_match() call. These cover the
	// separate budget on the whole matchAll/replace/split loop over many such calls.
	describe('operation budget', () => {
		// Each individual match here stays well inside the native step budget; only the
		// total cost of matching all 300 of them is pathological (~10s unbudgeted).
		const pathological = '(a+)+b';
		const input = ('a'.repeat(15) + 'cab').repeat(300);

		it('rejects a many-matches operation via matchAll() instead of running to completion', () => {
			const budgeted = createPcre2RegexEngine({ jsFlags: ['g'], operationTimeoutMs: 200 });
			const startedAt = performance.now();

			expect(() => budgeted.matchAll(pathological, input)).toThrow(Pcre2BudgetExceededError);
			expect(performance.now() - startedAt).toBeLessThan(3_000);
		});

		it('rejects a many-matches operation via a global replace()', () => {
			const budgeted = createPcre2RegexEngine({ jsFlags: ['g'], operationTimeoutMs: 200 });

			expect(() => budgeted.replace(pathological, input, 'g', 'X')).toThrow(
				Pcre2BudgetExceededError,
			);
		});

		it('rejects a many-matches operation via split()', () => {
			const budgeted = createPcre2RegexEngine({ jsFlags: ['g'], operationTimeoutMs: 200 });

			expect(() => budgeted.split(pathological, input)).toThrow(Pcre2BudgetExceededError);
		});

		it('reports the operation-limit kind, not a per-match budget kind', () => {
			const budgeted = createPcre2RegexEngine({ jsFlags: ['g'], operationTimeoutMs: 200 });

			try {
				budgeted.matchAll(pathological, input);
				expect.unreachable('expected matchAll to throw');
			} catch (error) {
				expect(error).toBeInstanceOf(Pcre2BudgetExceededError);
				expect((error as Pcre2BudgetExceededError).kind).toBe('operation-limit');
			}
		});

		it('caps the total match count of one operation', () => {
			const budgeted = createPcre2RegexEngine({ jsFlags: ['g'], maxMatchesPerOperation: 5 });

			expect(() => budgeted.matchAll('a', 'a'.repeat(100))).toThrow(Pcre2BudgetExceededError);
			expect(budgeted.matchAll('a', 'aaa')).toHaveLength(3);
		});

		it('does not fire on an ordinary operation with many cheap matches', () => {
			const budgeted = createPcre2RegexEngine({ jsFlags: ['g'] });

			expect(budgeted.matchAll('\\w+', 'word '.repeat(5_000))).toHaveLength(5_000);
		});
	});

	describe('handle cache bounding', () => {
		it('evicts least-recently-used patterns past maxCachedPatterns and keeps matching', () => {
			const bounded = createPcre2RegexEngine({ maxCachedPatterns: 4 });

			for (let i = 0; i < 50; i++) {
				expect(bounded.test(`pattern${i}`, `xx pattern${i} xx`)).toBe(true);
			}
			// An evicted pattern recompiles transparently on its next use.
			expect(bounded.test('pattern0', 'xx pattern0 xx')).toBe(true);
		});

		it('rejects maxCachedPatterns <= 0 instead of evicting a pattern it just compiled', () => {
			expect(() => createPcre2RegexEngine({ maxCachedPatterns: 0 })).toThrow(/positive integer/);
			expect(() => createPcre2RegexEngine({ maxCachedPatterns: -1 })).toThrow(/positive integer/);
		});
	});

	describe('dispose', () => {
		it('frees the cached handles', () => {
			const disposable = createPcre2RegexEngine();

			expect(disposable.test('a+b', 'aab')).toBe(true);
			expect(() => disposable.dispose()).not.toThrow();
		});
	});
});

describe('regexp parity', () => {
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
			{
				name: '1 capture group, match at position 0',
				pattern: '(\\w+)@',
				input: 'user@example.com',
			},
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
			const scalingEngine = createPcre2RegexEngine({ jsFlags: ['g', 'u'] });
			const timeFor = (repeats: number): number => {
				const input = '😀'.repeat(repeats);
				const start = performance.now();
				scalingEngine.matchAll('😀', input, 'ug');
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
});

describe('replace substitution', () => {
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
});

describe('syntax support', () => {
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
});

// A trap during runMatch() invalidates every cached handle before the caller's `finally`
// gets to call releaseSubject() on the one it was using (reinitModuleAfterTrap() tears down
// the whole wasm module). Without this check, that cleanup call would hit a dead native
// object -- either throwing again (masking the real Pcre2InternalError already in flight)
// or worse. Exercises releaseSubject() directly against a handle marked invalidated the
// same way reinitModuleAfterTrap() marks one, since a real trap isn't reliably reproducible
// in a test (see the wall-clock budget note below).
describe('releaseSubject() after a handle is invalidated', () => {
	beforeAll(async () => {
		await initPcre2Engine();
	});

	it('skips the native clearSubject() call for an invalidated handle, without throwing', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper('a+b', '', 1_000_000, 1_000_000, 20_000, 300, 0, 0, 0);
		try {
			runMatch(handle, 'a+b', '', 'xxaaabxx', 0);
			const clearSubject = vi.spyOn(handle, 'clearSubject');

			invalidatedHandles.add(handle);
			expect(() => releaseSubject(handle)).not.toThrow();

			expect(clearSubject).not.toHaveBeenCalled();
		} finally {
			handle.delete();
		}
	});

	it('still calls the native clearSubject() for a handle that was not invalidated', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper('a+b', '', 1_000_000, 1_000_000, 20_000, 300, 0, 0, 0);
		try {
			runMatch(handle, 'a+b', '', 'xxaaabxx', 0);
			const clearSubject = vi.spyOn(handle, 'clearSubject');

			releaseSubject(handle);

			expect(clearSubject).toHaveBeenCalledOnce();
		} finally {
			handle.delete();
		}
	});
});

// match_limit/depth_limit count backtrack steps, not wall-clock: an unanchored lazy
// quantifier can stay well under both while still costing real time per scan position, so
// they can't be relied on alone to bound a single pcre2_match() call's duration. This
// covers the native PCRE2_AUTO_CALLOUT-based deadline check (native/pcre2_wrapper.cpp)
// that exists specifically for that gap.
//
// The public createPcre2RegexEngine() API always uses the real 300ms WALL_CLOCK_LIMIT_MS
// (handle-cache.ts), and no pattern in this repo's corpus reliably exceeds that on
// reasonable hardware -- PCRE2's interpreter is well-optimized against most classic
// catastrophic-backtracking shapes (unlike native RegExp on the same patterns). So this
// exercises the mechanism directly against the generated module, with a deliberately tiny
// deadline, rather than hunting for an input slow enough to trip a 300ms budget in a test
// that must also run quickly and deterministically on CI.
describe('wall-clock budget (native callout)', () => {
	it('aborts a single match once its wall-clock deadline elapses, with a distinct status', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper(
			'(a+)+$',
			'',
			1_000_000, // matchLimit -- generous, so match-limit can't fire first
			1_000_000, // depthLimit
			20_000, // heapLimitKb
			1, // wallClockLimitMs -- deliberately tiny
			0,
			0,
			0,
		);
		try {
			expect(handle.compileStatus().ok).toBe(true);
			handle.setSubject('a'.repeat(35) + 'b');

			const start = performance.now();
			const result = handle.matchAt(0, false);
			const took = performance.now() - start;

			expect(result.status.value).toBe(module.MatchStatus.WallClockExceeded.value);
			expect(result.errorCode).toBe(-37); // PCRE2_ERROR_CALLOUT
			expect(took).toBeLessThan(1000);
		} finally {
			handle.delete();
		}
	});

	it('does not fire on a fast, legitimate match', async () => {
		const module = await createPcre2WrapperModule();
		const handle = new module.Pcre2Wrapper(
			'a+b',
			'',
			1_000_000,
			1_000_000,
			20_000,
			300, // wallClockLimitMs -- the real production value
			0,
			0,
			0,
		);
		try {
			handle.setSubject('xxaaabxx');
			const result = handle.matchAt(0, false);
			expect(result.status.value).toBe(module.MatchStatus.Match.value);
		} finally {
			handle.delete();
		}
	});
});
