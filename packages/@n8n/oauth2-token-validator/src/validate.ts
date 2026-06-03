import { createLocalJWKSet, createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

import { TokenValidationError } from './errors';
import type { JwksValidationOptions, TokenClaims } from './types';

/** Cache of remote JWKS resolvers, keyed by jwks_uri. */
const remoteKeySets = new Map<string, JWTVerifyGetKey>();

/** Cache of discovered jwks_uri values, keyed by issuer. */
const discoveredJwksUris = new Map<string, string>();

const WELL_KNOWN_PATH = '/.well-known/openid-configuration';

/**
 * Validate an OAuth2/OIDC bearer token as a signed JWT.
 *
 * Verifies the signature against the issuer's JWKS and checks the `exp`, `iss`,
 * and `aud` claims. On success returns the decoded claims; on any failure
 * throws {@link TokenValidationError}.
 */
export async function validateToken(
	token: string,
	options: JwksValidationOptions,
): Promise<TokenClaims> {
	const keyResolver = await resolveKeySet(options);

	try {
		const { payload } = await jwtVerify(token, keyResolver, {
			issuer: options.issuer,
			audience: options.audience,
		});
		return payload;
	} catch (error) {
		throw new TokenValidationError(
			error instanceof Error ? error.message : 'Token validation failed',
			{ cause: error },
		);
	}
}

async function resolveKeySet(options: JwksValidationOptions): Promise<JWTVerifyGetKey> {
	if (options.jwks) {
		return createLocalJWKSet(options.jwks);
	}

	const jwksUri = options.jwksUri ?? (await discoverJwksUri(options.issuer));
	return getRemoteKeySet(jwksUri);
}

function getRemoteKeySet(jwksUri: string): JWTVerifyGetKey {
	let keySet = remoteKeySets.get(jwksUri);
	if (!keySet) {
		keySet = createRemoteJWKSet(new URL(jwksUri));
		remoteKeySets.set(jwksUri, keySet);
	}
	return keySet;
}

async function discoverJwksUri(issuer: string): Promise<string> {
	const cached = discoveredJwksUris.get(issuer);
	if (cached) return cached;

	const url = `${issuer.replace(/\/$/, '')}${WELL_KNOWN_PATH}`;
	let metadata: { jwks_uri?: string };
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`discovery request returned HTTP ${response.status}`);
		}
		metadata = (await response.json()) as { jwks_uri?: string };
	} catch (error) {
		throw new TokenValidationError(`Failed to discover OIDC metadata at ${url}`, {
			cause: error,
		});
	}

	if (!metadata.jwks_uri) {
		throw new TokenValidationError(`OIDC metadata at ${url} did not contain a jwks_uri`);
	}

	discoveredJwksUris.set(issuer, metadata.jwks_uri);
	return metadata.jwks_uri;
}
