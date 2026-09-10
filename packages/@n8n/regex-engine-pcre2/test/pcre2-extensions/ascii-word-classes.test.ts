import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	engine = createPcre2RegexEngine({ jsFlags: ['u'] });
});

describe('\\w/\\d/\\b stay ASCII-only, with or without the u flag, matching native JS', () => {
	it('\\w does not match a non-ASCII letter', () => {
		expect(/\w/.test('é')).toBe(false);
		expect(/\w/u.test('é')).toBe(false);
		expect(engine.test('\\w', 'é')).toBe(false);
		expect(engine.test('\\w', 'é', 'u')).toBe(false);
	});

	it('\\d does not match a non-ASCII digit', () => {
		const fullwidthDigit = '０';
		expect(/\d/.test(fullwidthDigit)).toBe(false);
		expect(/\d/u.test(fullwidthDigit)).toBe(false);
		expect(engine.test('\\d', fullwidthDigit)).toBe(false);
		expect(engine.test('\\d', fullwidthDigit, 'u')).toBe(false);
	});

	it('\\b does not treat a non-ASCII letter as a word character', () => {
		const input = 'café bar';
		expect(/café\b/u.test(input)).toBe(false);
		expect(engine.test('café\\b', input, 'u')).toBe(false);

		expect(/bar\b/u.test(input)).toBe(true);
		expect(engine.test('bar\\b', input, 'u')).toBe(true);
	});
});

describe('opting into ucp widens \\w to match non-ASCII letters', () => {
	it('\\w matches a non-ASCII letter once ucp is on, unlike native JS', async () => {
		const ucpEngine = createPcre2RegexEngine({ compileOptions: ['ucp'] });
		expect(ucpEngine.test('\\w', 'é')).toBe(true);
		expect(/\w/u.test('é')).toBe(false);
	});
});
