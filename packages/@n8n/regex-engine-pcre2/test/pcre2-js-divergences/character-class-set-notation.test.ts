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
