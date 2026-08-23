import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import {
	IDENTITY_AUDIENCE,
	IDENTITY_ISSUER,
	IDENTITY_TOKEN_TTL_SECONDS,
	InvalidIdentityTokenError,
	mintIdentityToken,
	SharedSecretIdentityVerifier,
} from '../identity-token';

const secret = 'a'.repeat(32);
const caller = { cpId: 'cp-1', tenantId: 'tenant-1' };

describe('SharedSecretIdentityVerifier', () => {
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

	it('rejects an expired token', () => {
		const token = jwt.sign({ sub: caller.cpId, tenant_id: caller.tenantId }, secret, {
			algorithm: 'HS256',
			issuer: IDENTITY_ISSUER,
			audience: IDENTITY_AUDIENCE,
			expiresIn: -60, // longer ago than the verifier's clock-skew tolerance
		});
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token without an expiration', () => {
		const token = jwt.sign({ sub: caller.cpId, tenant_id: caller.tenantId }, secret, {
			algorithm: 'HS256',
			issuer: IDENTITY_ISSUER,
			audience: IDENTITY_AUDIENCE,
		});
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token older than the maximum age even when it has not expired', () => {
		const token = jwt.sign(
			{
				sub: caller.cpId,
				tenant_id: caller.tenantId,
				iat: Math.floor(Date.now() / 1000) - IDENTITY_TOKEN_TTL_SECONDS - 60,
			},
			secret,
			{
				algorithm: 'HS256',
				issuer: IDENTITY_ISSUER,
				audience: IDENTITY_AUDIENCE,
				expiresIn: 3600,
			},
		);
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token with the wrong audience', () => {
		const token = jwt.sign({ sub: caller.cpId, tenant_id: caller.tenantId }, secret, {
			algorithm: 'HS256',
			issuer: IDENTITY_ISSUER,
			audience: 'someone-else',
			expiresIn: 60,
		});
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token with the wrong issuer', () => {
		const token = jwt.sign({ sub: caller.cpId, tenant_id: caller.tenantId }, secret, {
			algorithm: 'HS256',
			issuer: 'someone-else',
			audience: IDENTITY_AUDIENCE,
			expiresIn: 60,
		});
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects an alg: none token', () => {
		const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
		const payload = Buffer.from(
			JSON.stringify({
				sub: caller.cpId,
				tenant_id: caller.tenantId,
				iss: IDENTITY_ISSUER,
				aud: IDENTITY_AUDIENCE,
				exp: Math.floor(Date.now() / 1000) + 60,
			}),
		).toString('base64url');
		const token = `${header}.${payload}.`;
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a token missing tenant_id', () => {
		const token = jwt.sign({ sub: caller.cpId }, secret, {
			algorithm: 'HS256',
			issuer: IDENTITY_ISSUER,
			audience: IDENTITY_AUDIENCE,
			expiresIn: 60,
		});
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify(token)).toThrow(InvalidIdentityTokenError);
	});

	it('rejects a non-JWT string', () => {
		const verifier = new SharedSecretIdentityVerifier(secret);

		expect(() => verifier.verify('not-a-jwt')).toThrow(InvalidIdentityTokenError);
	});
});
