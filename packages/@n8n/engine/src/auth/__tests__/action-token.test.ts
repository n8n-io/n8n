import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ACTION_TOKEN_SPEC,
	InvalidActionTokenError,
	mintActionToken,
	verifyActionToken,
} from '../action-token';
import { mintIdentityToken } from '../identity-token';

const secret = 'a'.repeat(32);

/** Past every deadline the verifier allows, so one advance covers expiry and max age. */
const PAST_EVERY_DEADLINE_MS =
	(ACTION_TOKEN_SPEC.ttlSeconds + ACTION_TOKEN_SPEC.clockToleranceSeconds + 1) * 1000;

/**
 * Signs a token from raw claims, bypassing {@link mintActionToken}. Only for
 * tokens the data plane cannot mint: a foreign scope, a foreign audience, an
 * expiry untied to the TTL. Anything the clock can express moves the clock
 * instead, so these tests do not restate how a real token is built.
 */
const signRawToken = (claims: Record<string, unknown>, options: jwt.SignOptions = {}) =>
	jwt.sign(claims, secret, {
		algorithm: 'HS256',
		issuer: ACTION_TOKEN_SPEC.issuer,
		audience: ACTION_TOKEN_SPEC.audience,
		...options,
	});

const verify = (token: string) => verifyActionToken(secret, token, 'credentials:read');

describe('verifyActionToken', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('round trips: accepts a token it minted for the scope', () => {
		expect(() => verify(mintActionToken(secret, 'credentials:read'))).not.toThrow();
	});

	it('rejects an identity token minted for the control plane to data plane direction', () => {
		const token = mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it.each(['credentials:write', 'lifecycle-events:write'])(
		'rejects a token with the scope %s, which the data plane cannot mint',
		(scope) => {
			const token = signRawToken({ scope }, { expiresIn: ACTION_TOKEN_SPEC.ttlSeconds });

			expect(() => verify(token)).toThrow(InvalidActionTokenError);
		},
	);

	it('rejects a token without a scope', () => {
		const token = signRawToken({}, { expiresIn: ACTION_TOKEN_SPEC.ttlSeconds });

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token signed with a different secret', () => {
		const token = mintActionToken('b'.repeat(32), 'credentials:read');

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it.each([
		['unset', ''],
		['under-length', 'a'.repeat(31)],
	])('rejects every token when the verifying secret is %s', (_label, verifyingSecret) => {
		const token = mintActionToken(secret, 'credentials:read');

		expect(() => verifyActionToken(verifyingSecret, token, 'credentials:read')).toThrow(
			InvalidActionTokenError,
		);
	});

	it('accepts a token still inside its lifetime', () => {
		const token = mintActionToken(secret, 'credentials:read');

		vi.advanceTimersByTime((ACTION_TOKEN_SPEC.ttlSeconds - 1) * 1000);

		expect(() => verify(token)).not.toThrow();
	});

	it('rejects a token once its lifetime has passed', () => {
		const token = mintActionToken(secret, 'credentials:read');

		vi.advanceTimersByTime(PAST_EVERY_DEADLINE_MS);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token minted further ahead than the clock-skew tolerance', () => {
		const now = Date.now();

		// Minted on a clock that runs ahead of this host by more than it tolerates.
		vi.setSystemTime(now + (ACTION_TOKEN_SPEC.clockToleranceSeconds + 60) * 1000);
		const token = mintActionToken(secret, 'credentials:read');
		vi.setSystemTime(now);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token older than the maximum age even when it has not expired', () => {
		// `mintActionToken` ties `exp` to the TTL, so only a raw token can outlive it.
		const token = signRawToken({ scope: 'credentials:read' }, { expiresIn: '1h' });

		vi.advanceTimersByTime(PAST_EVERY_DEADLINE_MS);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token without an expiration', () => {
		const token = signRawToken({ scope: 'credentials:read' });

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token with the wrong audience', () => {
		const token = signRawToken(
			{ scope: 'credentials:read' },
			{ audience: 'someone-else', expiresIn: ACTION_TOKEN_SPEC.ttlSeconds },
		);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token with the wrong issuer', () => {
		const token = signRawToken(
			{ scope: 'credentials:read' },
			{ issuer: 'someone-else', expiresIn: ACTION_TOKEN_SPEC.ttlSeconds },
		);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects an alg: none token', () => {
		const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
		const payload = Buffer.from(
			JSON.stringify({
				scope: 'credentials:read',
				iss: ACTION_TOKEN_SPEC.issuer,
				aud: ACTION_TOKEN_SPEC.audience,
				exp: Math.floor(Date.now() / 1000) + ACTION_TOKEN_SPEC.ttlSeconds,
			}),
		).toString('base64url');

		expect(() => verify(`${header}.${payload}.`)).toThrow(InvalidActionTokenError);
	});

	it('rejects a non-JWT string', () => {
		expect(() => verify('not-a-jwt')).toThrow(InvalidActionTokenError);
	});
});
