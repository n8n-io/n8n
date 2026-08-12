import { jsonParse } from 'n8n-workflow';

import { scrub, scrubDeep, type ScrubSecret } from '../redaction';

const secrets: ScrubSecret[] = [
	{ value: 'sk-live-abc123', label: 'STRIPE_API_KEY' },
	{ value: 'ya29.google-token', label: 'GOOGLE_SHEETS_ACCESS_TOKEN' },
];

describe('scrub', () => {
	it('redacts a single secret value with its label', () => {
		expect(scrub('key is sk-live-abc123 here', secrets)).toBe(
			'key is [REDACTED:STRIPE_API_KEY] here',
		);
	});

	it('redacts multiple different secret values', () => {
		expect(scrub('a=sk-live-abc123 b=ya29.google-token', secrets)).toBe(
			'a=[REDACTED:STRIPE_API_KEY] b=[REDACTED:GOOGLE_SHEETS_ACCESS_TOKEN]',
		);
	});

	it('redacts repeated occurrences of the same value', () => {
		expect(scrub('sk-live-abc123 and again sk-live-abc123', secrets)).toBe(
			'[REDACTED:STRIPE_API_KEY] and again [REDACTED:STRIPE_API_KEY]',
		);
	});

	it('redacts values embedded inside JSON text', () => {
		const json = JSON.stringify({ auth: { token: 'ya29.google-token' }, note: 'ok' });
		const scrubbed = scrub(json, secrets);
		expect(scrubbed).not.toContain('ya29.google-token');
		expect(scrubbed).toContain('[REDACTED:GOOGLE_SHEETS_ACCESS_TOKEN]');
		// Still valid JSON — only the value was replaced.
		expect(jsonParse(scrubbed)).toEqual({
			auth: { token: '[REDACTED:GOOGLE_SHEETS_ACCESS_TOKEN]' },
			note: 'ok',
		});
	});

	it('leaves clean text alone', () => {
		const clean = 'Creating the sheet with 4 columns…';
		expect(scrub(clean, secrets)).toBe(clean);
	});

	it('leaves text alone when there are no secrets', () => {
		expect(scrub('anything sk-live-abc123', [])).toBe('anything sk-live-abc123');
	});

	it('scrubs longer values first so no partial remainder is left', () => {
		const nested: ScrubSecret[] = [
			{ value: 'token', label: 'SHORT' },
			{ value: 'token-extended-secret', label: 'LONG' },
		];
		expect(scrub('use token-extended-secret now', nested)).toBe('use [REDACTED:LONG] now');
	});

	it('ignores values too short to scrub safely', () => {
		const short: ScrubSecret[] = [{ value: 'a', label: 'TINY' }];
		expect(scrub('a normal sentence', short)).toBe('a normal sentence');
	});
});

describe('scrubDeep', () => {
	it('scrubs strings in nested objects, arrays, and keys', () => {
		const input = {
			url: 'https://api.test?key=sk-live-abc123',
			items: ['ya29.google-token', 42, null],
			'sk-live-abc123': 'value under secret key',
			nested: { deep: 'sk-live-abc123' },
		};
		expect(scrubDeep(input, secrets)).toEqual({
			url: 'https://api.test?key=[REDACTED:STRIPE_API_KEY]',
			items: ['[REDACTED:GOOGLE_SHEETS_ACCESS_TOKEN]', 42, null],
			'[REDACTED:STRIPE_API_KEY]': 'value under secret key',
			nested: { deep: '[REDACTED:STRIPE_API_KEY]' },
		});
	});

	it('passes non-string primitives through unchanged', () => {
		expect(scrubDeep(42, secrets)).toBe(42);
		expect(scrubDeep(true, secrets)).toBe(true);
		expect(scrubDeep(null, secrets)).toBe(null);
		expect(scrubDeep(undefined, secrets)).toBe(undefined);
	});
});
