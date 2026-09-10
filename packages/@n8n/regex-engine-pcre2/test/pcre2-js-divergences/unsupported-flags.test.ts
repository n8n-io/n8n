import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	Pcre2CompileError,
	type Pcre2Flag,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

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

describe('y (sticky) flag: rejected, not implementable', () => {
	it('"y" is not part of the Pcre2Flag type union', () => {
		// @ts-expect-error - 'y' is not assignable to Pcre2Flag
		const sticky: Pcre2Flag = 'y';
		expect(sticky).toBe('y');
	});

	it('passing "y" at runtime throws Pcre2CompileError', () => {
		expect(() => engine.test('foo', 'foofoo', 'y')).toThrow(Pcre2CompileError);
		expect(() => engine.exec('foo', 'xxfoo', 'y')).toThrow(Pcre2CompileError);
		expect(() => engine.matchAll('foo', 'xxfoofoo', 'y')).toThrow(Pcre2CompileError);
	});

	it('sticky, lastIndex-anchored repeated matching is not achievable through the public API', () => {
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
