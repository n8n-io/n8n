import type { User } from '@n8n/db';
import { DeploymentKey, OAUTH_JWE_PRIVATE_KEY_TYPE } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { JSONWebKeySet } from 'jose';
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';
import { Cipher } from 'n8n-core';
import type { JsonWebKey } from 'node:crypto';
import { createPrivateKey } from 'node:crypto';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAUTH_ACCESS_TOKEN_TTL_SECONDS } from '../oauth-signing-key.constants';
import { OAuthSigningKeyService } from '../oauth-signing-key.service';
import { OAuthTokenService } from '../oauth-token.service';
import { AccessTokenNotFoundError, JWTVerificationError } from '../oauth.errors';

const testServer = setupTestServer({
	modules: ['oauth-jwe', 'oauth-server', 'mcp'],
	endpointGroups: ['mcp', 'jwks'],
});

let owner: User;
let issuer: string;
let jwks: JSONWebKeySet;

beforeAll(async () => {
	owner = await createOwner();

	const discovery = await testServer.restlessAgent
		.get('/.well-known/oauth-authorization-server')
		.expect(200);
	issuer = discovery.body.issuer as string;
	const jwksPath = new URL(discovery.body.jwks_uri as string).pathname;
	jwks = (await testServer.restlessAgent.get(jwksPath).expect(200)).body as JSONWebKeySet;
});

describe('OAuth access-token signing', () => {
	const claims = () => {
		const now = Math.floor(Date.now() / 1000);
		return {
			iss: issuer,
			sub: owner.id,
			aud: `${issuer}/mcp-server/http`,
			client_id: 'client-1',
			iat: now,
			exp: now + 60,
			scope: '',
			meta: { isOAuth: true },
		};
	};

	it('mints tokens that verify with only the published JWKS, next to the JWE key', async () => {
		expect(jwks.keys.map((key) => key.use).sort()).toEqual(['enc', 'sig']);
		const resource = `${issuer}/mcp-server/http`;

		const { accessToken } = Container.get(OAuthTokenService).generateTokenPair(
			owner.id,
			'client-1',
			resource,
			['tool:read'],
		);

		const { payload, protectedHeader } = await jwtVerify(accessToken, createLocalJWKSet(jwks), {
			issuer,
			audience: resource,
			typ: 'at+jwt',
			algorithms: ['ES256'],
		});
		const signingKey = jwks.keys.find((key) => key.use === 'sig');
		expect(protectedHeader).toEqual({ alg: 'ES256', typ: 'at+jwt', kid: signingKey?.kid });
		expect(payload).toEqual({
			iss: issuer,
			sub: owner.id,
			aud: resource,
			client_id: 'client-1',
			jti: expect.any(String),
			iat: expect.any(Number),
			exp: payload.iat! + OAUTH_ACCESS_TOKEN_TTL_SECONDS,
			scope: 'tool:read',
			meta: { isOAuth: true },
		});
	});

	it('rejects a token signed with the JWE key under its own kid', async () => {
		const jweRow = await Container.get(DataSource)
			.getRepository(DeploymentKey)
			.findOneByOrFail({ type: OAUTH_JWE_PRIVATE_KEY_TYPE, status: 'active' });
		const jweJwk = JSON.parse(
			Container.get(Cipher).decryptDEKWithInstanceKey(jweRow.value),
		) as JsonWebKey;
		const jweKid = jwks.keys.find((key) => key.use === 'enc')?.kid;
		expect(jweKid).toBe(jweRow.id);

		const token = jwt.sign(claims(), createPrivateKey({ key: jweJwk, format: 'jwk' }), {
			algorithm: 'RS256',
			header: { alg: 'RS256', typ: 'at+jwt', kid: jweRow.id },
		});
		expect(decodeProtectedHeader(token).kid).toBe(jweKid);

		await expect(
			Container.get(OAuthTokenService).verifyAccessToken(token, `${issuer}/mcp-server/http`),
		).rejects.toThrow(JWTVerificationError);
	});

	it('accepts the same claims signed with the signing key', async () => {
		const { aud, ...rest } = claims();
		const token = Container.get(OAuthSigningKeyService).signAccessToken(rest, aud);

		// The token is not in the database, so it passes JWT verification and
		// fails only on the lookup.
		await expect(
			Container.get(OAuthTokenService).verifyAccessToken(token, `${issuer}/mcp-server/http`),
		).rejects.toThrow(AccessTokenNotFoundError);
	});
});
