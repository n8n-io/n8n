import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	IDENTITY_TOKEN,
	InvalidIdentityTokenError,
	mintIdentityToken,
	SharedSecretIdentityVerifier,
} from '../identity-token';

const secret = 'a'.repeat(32);
const caller = { cpId: 'cp-1', tenantId: 'tenant-1' };

/** Past every deadline the verifier allows, so one advance covers expiry and max age. */
const PAST_EVERY_DEADLINE_MS =
	(IDENTITY_TOKEN.ttlSeconds + IDENTITY_TOKEN.clockToleranceSeconds + 1) * 1000;

/**
 * Signs a token from raw claims, bypassing {@link mintIdentityToken}. Only for
 * tokens the control plane cannot mint: a missing `exp`, a foreign audience, an
 * expiry untied to the TTL. Anything the clock can express moves the clock
 * instead, so these tests do not restate how a real token is built.
 */
const signRawToken = (claims: Record<string, unknown>, options: jwt.SignOptions = {}) =>
	jwt.sign(claims, secret, {
		algorithm: 'HS256',
		issuer: IDENTITY_TOKEN.issuer,
		audience: IDENTITY_TOKEN.audience,
		...options,
	});

describe('SharedSecretIdentityVerifier', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('constructing rejects an under-length secret', () => {
		expect(() => new SharedSecretIdentityVerifier('short')).toThrow();
	});

	it('constructing rejects a missing secret', () => {
		expect(() => new SharedSecretIdentityVerifier('')).toThrow();
	});

	it('round trips: verify returns the caller mint signed', () => {
		const token = mintIdentityToken(secret, caller);
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(verifier.verify(token)).toEqual(caller);
	});

	it('rejects a token signed with a different secret', () => {
		const token = mintIdentityToken('b'.repeat(32), caller);
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('accepts a token still inside its lifetime', () => {
		const token = mintIdentityToken(secret, caller);
		const verifier = new SharedSecretIdentityVerifier(secret);

		vi.advanceTimersByTime((IDENTITY_TOKEN.ttlSeconds - 1) * 1000);

		expect(verifier.verify(token)).toEqual(caller);
	});

	it('rejects a token once its lifetime has passed', () => {
		const token = mintIdentityToken(secret, caller);
		const verifier = new SharedSecretIdentityVerifier(secret);

		vi.advanceTimersByTime(PAST_EVERY_DEADLINE_MS);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token minted further ahead than the clock-skew tolerance', () => {
		const now = Date.now();
		const verifier = new SharedSecretIdentityVerifier(secret);

		// Minted on a clock that runs ahead of this host by more than it tolerates.
		vi.setSystemTime(now + (IDENTITY_TOKEN.clockToleranceSeconds + 60) * 1000);
		const token = mintIdentityToken(secret, caller);
		vi.setSystemTime(now);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token older than the maximum age even when it has not expired', () => {
		// `mintIdentityToken` ties `exp` to the TTL, so only a raw token can outlive it.
		const token = signRawToken(
			{ sub: caller.cpId, tenant_id: caller.tenantId },
			{ expiresIn: '1h' },
		);
		const verifier = new SharedSecretIdentityVerifier(secret);

		vi.advanceTimersByTime(PAST_EVERY_DEADLINE_MS);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token without an expiration', () => {
		const token = signRawToken({ sub: caller.cpId, tenant_id: caller.tenantId });
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token with the wrong audience', () => {
		const token = signRawToken(
			{ sub: caller.cpId, tenant_id: caller.tenantId },
			{ audience: 'someone-else', expiresIn: IDENTITY_TOKEN.ttlSeconds },
		);
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token with the wrong issuer', () => {
		const token = signRawToken(
			{ sub: caller.cpId, tenant_id: caller.tenantId },
			{ issuer: 'someone-else', expiresIn: IDENTITY_TOKEN.ttlSeconds },
		);
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects an alg: none token', () => {
		const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
		const payload = Buffer.from(
			JSON.stringify({
				sub: caller.cpId,
				tenant_id: caller.tenantId,
				iss: IDENTITY_TOKEN.issuer,
				aud: IDENTITY_TOKEN.audience,
				exp: Math.floor(Date.now() / 1000) + IDENTITY_TOKEN.ttlSeconds,
			}),
		).toString('base64url');
		const token = `${header}.${payload}.`;
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token missing tenant_id', () => {
		const token = signRawToken({ sub: caller.cpId }, { expiresIn: IDENTITY_TOKEN.ttlSeconds });
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a non-JWT string', () => {
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify('not-a-jwt')).toThrow(InvalidIdentityTokenError);
	});
});
