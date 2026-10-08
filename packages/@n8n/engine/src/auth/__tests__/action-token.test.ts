import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ACTION_TOKEN,
	InvalidActionTokenError,
	mintActionToken,
	verifyActionToken,
} from '../action-token';
import { mintIdentityToken } from '../identity-token';

const secret = 'a'.repeat(32);

/** Past every deadline the verifier allows, so one advance covers expiry and max age. */
const PAST_EVERY_DEADLINE_MS =
	(ACTION_TOKEN.ttlSeconds + ACTION_TOKEN.clockToleranceSeconds + 1) * 1000;

/**
 * Signs a token from raw claims, bypassing {@link mintActionToken}. Only for
 * tokens the data plane cannot mint: a foreign scope, a foreign audience, an
 * expiry untied to the TTL. Anything the clock can express moves the clock
 * instead, so these tests do not restate how a real token is built.
 */
const signRawToken = (claims: Record<string, unknown>, options: jwt.SignOptions = {}) =>
	jwt.sign(claims, secret, {
		algorithm: 'HS256',
		issuer: ACTION_TOKEN.issuer,
		audience: ACTION_TOKEN.audience,
		...options,
	});

const verify = (token: string) => verifyActionToken(secret, token, 'lifecycle-events:write');

describe('verifyActionToken', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('round trips: accepts a token it minted for the scope', () => {
		expect(() => verify(mintActionToken(secret, 'lifecycle-events:write'))).not.toThrow();
	});

	it('rejects an identity token minted for the control plane to data plane direction', () => {
		const token = mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a lifecycle-events:write token when credentials:read is required', () => {
		const token = mintActionToken(secret, 'lifecycle-events:write');

		expect(() => verifyActionToken(secret, token, 'credentials:read')).toThrow(
			InvalidActionTokenError,
		);
	});

	it('rejects a credentials:read token when lifecycle-events:write is required', () => {
		const token = mintActionToken(secret, 'credentials:read');

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token whose scope is not one the data plane can mint', () => {
		const token = signRawToken(
			{ scope: 'credentials:write' },
			{ expiresIn: ACTION_TOKEN.ttlSeconds },
		);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token without a scope', () => {
		const token = signRawToken({}, { expiresIn: ACTION_TOKEN.ttlSeconds });

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token signed with a different secret', () => {
		const token = mintActionToken('b'.repeat(32), 'lifecycle-events:write');

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it.each([
		['unset', ''],
		['under-length', 'a'.repeat(31)],
	])('rejects every token when the verifying secret is %s', (_label, verifyingSecret) => {
		const token = mintActionToken(secret, 'lifecycle-events:write');

		expect(() => verifyActionToken(verifyingSecret, token, 'lifecycle-events:write')).toThrow(
			InvalidActionTokenError,
		);
	});

	it('accepts a token still inside its lifetime', () => {
		const token = mintActionToken(secret, 'lifecycle-events:write');

		vi.advanceTimersByTime((ACTION_TOKEN.ttlSeconds - 1) * 1000);

		expect(() => verify(token)).not.toThrow();
	});

	it('rejects a token once its lifetime has passed', () => {
		const token = mintActionToken(secret, 'lifecycle-events:write');

		vi.advanceTimersByTime(PAST_EVERY_DEADLINE_MS);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token minted further ahead than the clock-skew tolerance', () => {
		const now = Date.now();

		// Minted on a clock that runs ahead of this host by more than it tolerates.
		vi.setSystemTime(now + (ACTION_TOKEN.clockToleranceSeconds + 60) * 1000);
		const token = mintActionToken(secret, 'lifecycle-events:write');
		vi.setSystemTime(now);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token older than the maximum age even when it has not expired', () => {
		// `mintActionToken` ties `exp` to the TTL, so only a raw token can outlive it.
		const token = signRawToken({ scope: 'lifecycle-events:write' }, { expiresIn: '1h' });

		vi.advanceTimersByTime(PAST_EVERY_DEADLINE_MS);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token without an expiration', () => {
		const token = signRawToken({ scope: 'lifecycle-events:write' });

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token with the wrong audience', () => {
		const token = signRawToken(
			{ scope: 'lifecycle-events:write' },
			{ audience: 'someone-else', expiresIn: ACTION_TOKEN.ttlSeconds },
		);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects a token with the wrong issuer', () => {
		const token = signRawToken(
			{ scope: 'lifecycle-events:write' },
			{ issuer: 'someone-else', expiresIn: ACTION_TOKEN.ttlSeconds },
		);

		expect(() => verify(token)).toThrow(InvalidActionTokenError);
	});

	it('rejects an alg: none token', () => {
		const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
		const payload = Buffer.from(
			JSON.stringify({
				scope: 'lifecycle-events:write',
				iss: ACTION_TOKEN.issuer,
				aud: ACTION_TOKEN.audience,
				exp: Math.floor(Date.now() / 1000) + ACTION_TOKEN.ttlSeconds,
			}),
		).toString('base64url');

		expect(() => verify(`${header}.${payload}.`)).toThrow(InvalidActionTokenError);
	});

	it('rejects a non-JWT string', () => {
		expect(() => verify('not-a-jwt')).toThrow(InvalidActionTokenError);
	});
});
