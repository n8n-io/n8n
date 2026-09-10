import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	Pcre2CompileError,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

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
	it('is matched natively by "." without the u flag, but behaves differently under PCRE2', () => {
		const input = 'a\uD800b';

		expect(/^a.b$/.test(input)).toBe(true);
		expect(() => engine.test('a.b', input)).toThrow(/UTF-8 error/);
	});
});
