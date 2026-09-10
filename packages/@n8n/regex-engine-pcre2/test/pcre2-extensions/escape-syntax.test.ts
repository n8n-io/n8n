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
	engine = createPcre2RegexEngine({ compileOptions: ['altBsux'], jsFlags: ['u'] });
});

describe('default (no altBsux): plain PCRE2 rejects the ES-style escape', () => {
	it('\\u0041 fails to compile without the option', async () => {
		const pureEngine = createPcre2RegexEngine();
		expect(() => pureEngine.test('\\u0041', 'A')).toThrow(Pcre2CompileError);
	});
});

describe('\\u / \\u{...} / \\x escapes match their ECMAScript equivalents', () => {
	it('\\u0041 (4-hex-digit form) matches "A", natively and via our engine', () => {
		expect(/A/.test('A')).toBe(true);
		expect(engine.test('\\u0041', 'A')).toBe(true);
	});

	it('\\u{1F600} (braced codepoint form, u flag) matches the emoji it represents', () => {
		const emoji = String.fromCodePoint(0x1f600);
		expect(new RegExp('\\u{1F600}', 'u').test(emoji)).toBe(true);
		expect(engine.test('\\u{1F600}', emoji, 'u')).toBe(true);
	});

	it('\\x41 (2-hex-digit form) matches "A", natively and via our engine', () => {
		expect(/\x41/.test('A')).toBe(true);
		expect(engine.test('\\x41', 'A')).toBe(true);
	});
});

describe('known limitation: the literal-fallback path ignores the `u` flag', () => {
	it('a bare \\u with no hex digits: native JS falls back to literal "u" without the u flag, throws with it', () => {
		expect(new RegExp('\\u').test('u')).toBe(true);
		expect(engine.test('\\u', 'u')).toBe(true);

		expect(() => new RegExp('\\u', 'u')).toThrow(SyntaxError);
		expect(engine.test('\\u', 'u', 'u')).toBe(true);
	});

	it('a malformed \\u12 (too few hex digits): same fallback-vs-throw split', () => {
		expect(new RegExp('\\u12').test('u12')).toBe(true);
		expect(engine.test('\\u12', 'u12')).toBe(true);

		expect(() => new RegExp('\\u12', 'u')).toThrow(SyntaxError);
		expect(engine.test('\\u12', 'u12', 'u')).toBe(true);
	});
});
