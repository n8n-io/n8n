import { describe, expect, it } from 'vitest';

import { getJwtExpiry } from './get-jwt-expiry';

function base64url(input: string): string {
	return Buffer.from(input, 'utf8').toString('base64url');
}

function makeJwt(payload: Record<string, unknown>): string {
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = base64url(JSON.stringify(payload));
	return `${header}.${body}.signature`;
}

describe('getJwtExpiry', () => {
	it('returns the exp claim (seconds since epoch) for a valid JWT', () => {
		const exp = 1_700_000_000;
		expect(getJwtExpiry(makeJwt({ exp }))).toBe(exp);
	});

	it('returns undefined for an opaque (non-JWT) token', () => {
		expect(getJwtExpiry('opaque-token')).toBeUndefined();
	});

	it('returns undefined when exp is missing', () => {
		expect(getJwtExpiry(makeJwt({ sub: 'user' }))).toBeUndefined();
	});

	it('returns undefined when exp is not a number', () => {
		expect(getJwtExpiry(makeJwt({ exp: 'soon' }))).toBeUndefined();
	});

	it('returns undefined for malformed base64', () => {
		expect(getJwtExpiry('not.valid-base64!!.sig')).toBeUndefined();
	});
});
