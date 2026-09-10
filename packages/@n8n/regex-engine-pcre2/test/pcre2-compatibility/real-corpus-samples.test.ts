import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

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
