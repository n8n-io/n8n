import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	Pcre2CompileError,
	Pcre2MatchError,
	type Pcre2Flag,
	type RegexEngine,
} from '../src/pcre2-engine.js';

describe('character class set notation', () => {
	let engine: RegexEngine;

	beforeAll(async () => {
		await initPcre2Engine();
		engine = createPcre2RegexEngine();
	});

	describe('subtraction operator `--`, e.g. [\\p{L}--[a-z]]', () => {
		it('is supported natively under the v flag (letters minus ASCII lowercase)', () => {
			const re = new RegExp('[\\p{L}--[a-z]]', 'v');
			expect(re.test('é')).toBe(true);
			expect(re.test('a')).toBe(false);
		});

		it('is rejected by our engine at compile time', () => {
			expect(() => engine.test('[\\p{L}--[a-z]]', 'é')).toThrow(Pcre2CompileError);
			expect(() => engine.test('[\\p{L}--[a-z]]', 'a')).toThrow(Pcre2CompileError);
		});
	});

	describe('intersection operator `&&`, e.g. [\\p{L}&&\\p{Lu}]', () => {
		it('is supported natively under the v flag (letters intersected with uppercase)', () => {
			const re = new RegExp('[\\p{L}&&\\p{Lu}]', 'v');
			expect(re.test('A')).toBe(true);
			expect(re.test('a')).toBe(false);
		});

		it('does NOT throw under our engine -- it silently misparses `&&` as literal alternation members', () => {
			expect(engine.test('[\\p{L}&&\\p{Lu}]', 'A')).toBe(true);
			expect(engine.test('[\\p{L}&&\\p{Lu}]', 'a')).toBe(true);
			expect(engine.test('[\\p{L}&&\\p{Lu}]', '1')).toBe(false);
			expect(engine.test('[\\p{L}&&\\p{Lu}]', '&')).toBe(true);
		});
	});
});

describe('es-pcre2 divergences (curated fixture corpus)', () => {
	type PackedResult = null | [string, ...(string | null)[]];

	interface DivergenceCase {
		category: string;
		pattern: string;
		flags: string;
		input: string;
		pcre2Result: PackedResult;
		jsResult: PackedResult;
	}

	type DivergenceCaseTuple = [
		DivergenceCase['category'],
		DivergenceCase['pattern'],
		DivergenceCase['flags'],
		DivergenceCase['input'],
		DivergenceCase['pcre2Result'],
		DivergenceCase['jsResult'],
	];

	const FIXTURE = path.join(__dirname, 'fixtures/corpus/curated-cases.json');
	const tuples: DivergenceCaseTuple[] = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).divergences;
	const cases: DivergenceCase[] = tuples.map(
		([category, pattern, flags, input, pcre2Result, jsResult]) => ({
			category,
			pattern,
			flags,
			input,
			pcre2Result,
			jsResult,
		}),
	);

	let engine: RegexEngine;

	beforeAll(async () => {
		await initPcre2Engine();
		engine = createPcre2RegexEngine({
			compileOptions: ['altBsux', 'matchUnsetBackref'],
			jsFlags: ['g', 'u'],
		});
	});

	it("has cases (sanity check the fixture file isn't empty)", () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	for (const [index, c] of cases.entries()) {
		describe(`${c.category}#${index}`, () => {
			it(`our engine matches real PCRE2, not native JS, for /${c.pattern}/${c.flags} on ${JSON.stringify(c.input)}`, () => {
				const native = new RegExp(c.pattern, c.flags).exec(c.input);
				if (c.jsResult === null) {
					expect(native).toBeNull();
				} else {
					expect(native?.[0]).toBe(c.jsResult[0]);
				}

				const result = engine.exec(c.pattern, c.input, c.flags);
				if (c.pcre2Result === null) {
					expect(result).toBeNull();
					return;
				}
				const [whole, ...expectedGroups] = c.pcre2Result;
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
		});
	}
});

describe('known divergences', () => {
	let engine: RegexEngine;

	beforeAll(async () => {
		await initPcre2Engine();
		engine = createPcre2RegexEngine();
	});

	describe('known divergence: [^] "any char including newline" idiom', () => {
		it('is valid, matching JS syntax but PCRE2 rejects it at compile time', () => {
			expect(/a[^]b/.test('a\nb')).toBe(true);
			expect(() => engine.test('a[^]b', 'a\nb')).toThrow(Pcre2CompileError);
		});
	});

	describe('known divergence: \\s and the BOM (U+FEFF)', () => {
		it('is matched by \\s natively, but not by \\s under PCRE2', () => {
			const bom = '﻿';

			expect(/\s/.test(bom)).toBe(true);
			expect(engine.test('\\s', bom)).toBe(false);
		});
	});

	describe('known divergence: lookbehind length cap', () => {
		it('does NOT reject a long FIXED-length lookbehind', () => {
			const longRun = 'a'.repeat(300);
			const longInput = longRun + 'b';

			expect(new RegExp(`(?<=${longRun})b`).test(longInput)).toBe(true);
			expect(engine.test(`(?<=${longRun})b`, longInput)).toBe(true);
		});

		it('does cap a VARIABLE-length lookbehind branch at 255 characters', () => {
			const under = 255;
			const over = 256;

			expect(new RegExp(`(?<=a{1,${under}})b`).test('a'.repeat(under) + 'b')).toBe(true);
			expect(new RegExp(`(?<=a{1,${over}})b`).test('a'.repeat(over) + 'b')).toBe(true);

			expect(engine.test(`(?<=a{1,${under}})b`, 'a'.repeat(under) + 'b')).toBe(true);
			expect(() => engine.test(`(?<=a{1,${over}})b`, 'a'.repeat(over) + 'b')).toThrow(
				Pcre2CompileError,
			);
		});

		it('compiles and matches fine for a fixed-length lookbehind well under any cap', () => {
			const shortRun = 'a'.repeat(50);
			const shortInput = shortRun + 'b';

			expect(new RegExp(`(?<=${shortRun})b`).test(shortInput)).toBe(true);
			expect(engine.test(`(?<=${shortRun})b`, shortInput)).toBe(true);
		});
	});

	describe('known divergence: unpaired surrogates and "."', () => {
		const input = 'a\uD800b';

		it('matches a lone surrogate with "." without the u flag, same as native RegExp', () => {
			expect(/^a.b$/.test(input)).toBe(true);
			expect(engine.test('a.b', input)).toBe(true);
		});

		it('rejects a lone surrogate under the u flag, where native RegExp still matches it', () => {
			const unicodeEngine = createPcre2RegexEngine({ jsFlags: ['u'] });

			expect(/^a.b$/u.test(input)).toBe(true);
			expect(() => unicodeEngine.test('a.b', input, 'u')).toThrow(Pcre2MatchError);
		});
	});
});

describe('unsupported flags', () => {
	let engine: RegexEngine;

	beforeAll(async () => {
		await initPcre2Engine();
		engine = createPcre2RegexEngine();
	});

	describe('g (global) flag: rejected by default, opt-in via jsFlags', () => {
		it('a default engine throws on "g", like any other unsupported flag', () => {
			expect(() => engine.matchAll('a', 'banana', 'g')).toThrow(Pcre2CompileError);
			expect(() => engine.replace('a', 'banana', 'g', 'X')).toThrow(Pcre2CompileError);
		});

		it('matchAll/replace never actually branch on "g" -- it only gates whether the flag is accepted', () => {
			const compat = createPcre2RegexEngine({ jsFlags: ['g'] });
			const withoutG = compat.matchAll('a', 'banana');
			const withG = compat.matchAll('a', 'banana', 'g');
			expect(withG.map((r) => [r[0], r.index])).toEqual(withoutG.map((r) => [r[0], r.index]));
		});
	});

	describe('g flag, opted in: emulated, not passed through to PCRE2', () => {
		let compat: RegexEngine;

		beforeAll(() => {
			compat = createPcre2RegexEngine({ jsFlags: ['g'] });
		});

		it('matchAll finds every match in one call, looping internally, with no lastIndex exposed to the caller', () => {
			const results = compat.matchAll('a', 'banana');
			expect(results.map((r) => r[0])).toEqual(['a', 'a', 'a']);
			expect(results.map((r) => r.index)).toEqual([1, 3, 5]);
		});

		it('replace respects g vs non-g', () => {
			expect(compat.replace('a', 'banana', '', 'X')).toBe('bXnana');
			expect(compat.replace('a', 'banana', 'g', 'X')).toBe('bXnXnX');
		});
	});

	describe('y (sticky) flag: rejected unless opted in via jsFlags', () => {
		it('"y" is not part of the default Pcre2Flag type union', () => {
			// @ts-expect-error - 'y' is not assignable to Pcre2Flag
			const sticky: Pcre2Flag = 'y';
			expect(sticky).toBe('y');
		});

		it('passing "y" at runtime throws Pcre2CompileError on an engine that did not opt in', () => {
			expect(() => engine.test('foo', 'foofoo', 'y')).toThrow(Pcre2CompileError);
			expect(() => engine.exec('foo', 'xxfoo', 'y')).toThrow(Pcre2CompileError);
			expect(() => engine.matchAll('foo', 'xxfoofoo', 'y')).toThrow(Pcre2CompileError);
		});

		it('the public API surface is unaffected by which flags are opted into', () => {
			const engineMethods = engine as unknown as Record<string, unknown>;
			for (const name of ['test', 'exec', 'replace', 'matchAll', 'split']) {
				expect(typeof engineMethods[name]).toBe('function');
			}
		});
	});

	describe('d (indices) flag: rejected, not implemented', () => {
		it('native JS /d produces a .indices property with [start,end] tuples', () => {
			const nativeResult = /(\w+)/d.exec('hello');
			expect(nativeResult).not.toBeNull();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const indices = (nativeResult as any).indices;
			expect(indices).toBeDefined();
			expect(indices[0]).toEqual([0, 5]);
			expect(indices[1]).toEqual([0, 5]);
		});

		it('our engine throws Pcre2CompileError when "d" is passed', () => {
			expect(() => engine.test('(\\w+)', 'hello', 'd')).toThrow(Pcre2CompileError);
			expect(() => engine.exec('(\\w+)', 'hello', 'd')).toThrow(Pcre2CompileError);
		});
	});
});
