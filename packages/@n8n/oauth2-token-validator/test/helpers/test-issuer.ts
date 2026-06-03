import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { JSONWebKeySet } from 'jose';

export interface TestIssuerOptions {
	issuer: string;
	audience?: string;
	kid?: string;
}

export interface IssueTokenOptions {
	/** Override the `iss` claim (defaults to the issuer's). */
	issuer?: string;
	/** Override the `aud` claim (defaults to the issuer's). */
	audience?: string;
	/** Absolute expiry as epoch seconds. Defaults to now + 300s. */
	expSeconds?: number;
	/** Absolute issued-at as epoch seconds. Defaults to now. */
	iatSeconds?: number;
}

export interface TestIssuer {
	/** Public JWKS for this issuer, suitable for `validateToken({ jwks })`. */
	jwks: JSONWebKeySet;
	/** Mint a signed RS256 JWT with the given claims. */
	issueToken: (claims?: Record<string, unknown>, opts?: IssueTokenOptions) => Promise<string>;
}

/**
 * A minimal local OIDC issuer for tests and the POC demo: generates an RS256
 * key pair, exposes the public JWKS, and signs short-lived JWTs. No network,
 * no external IdP. The same key material can be served over HTTP by
 * `serve-issuer.ts` for end-to-end demos.
 */
export async function createTestIssuer(options: TestIssuerOptions): Promise<TestIssuer> {
	const kid = options.kid ?? 'test-key-1';
	const { publicKey, privateKey } = await generateKeyPair('RS256');

	const publicJwk = await exportJWK(publicKey);
	publicJwk.kid = kid;
	publicJwk.alg = 'RS256';
	publicJwk.use = 'sig';

	const jwks: JSONWebKeySet = { keys: [publicJwk] };

	const issueToken = async (
		claims: Record<string, unknown> = {},
		opts: IssueTokenOptions = {},
	): Promise<string> => {
		const now = Math.floor(Date.now() / 1000);
		return await new SignJWT(claims)
			.setProtectedHeader({ alg: 'RS256', kid })
			.setIssuedAt(opts.iatSeconds ?? now)
			.setIssuer(opts.issuer ?? options.issuer)
			.setAudience(opts.audience ?? options.audience ?? 'unused')
			.setExpirationTime(opts.expSeconds ?? now + 300)
			.sign(privateKey);
	};

	return { jwks, issueToken };
}
