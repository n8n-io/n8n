import { describe, it, expect } from 'vitest';

import { parseUserAgent } from './parseUserAgent';

describe('parseUserAgent', () => {
	it('returns empty object for null', () => {
		expect(parseUserAgent(null)).toEqual({});
	});

	it('detects Chrome on macOS', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Chrome', os: 'macOS' });
	});

	it('prefers Edge over Chrome when both tokens are present', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Edge', os: 'Windows' });
	});

	it('detects Safari on iOS', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Safari', os: 'iOS' });
	});

	it('detects Firefox on Linux', () => {
		const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Firefox', os: 'Linux' });
	});

	it('returns no fields for an unrecognized agent', () => {
		expect(parseUserAgent('curl/8.0.1')).toEqual({ browser: undefined, os: undefined });
	});
});
