import type crypto from 'node:crypto';
import { createPublicKey } from 'node:crypto';

import type { Algorithm } from 'jsonwebtoken';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import type { JwksKeySource, ResolvedTrustedKey } from '../token-exchange.schemas';
import { JwtAlgorithmSchema } from '../token-exchange.schemas';

/**
 * Superset of jsonwebtoken's Algorithm that includes EdDSA.
 * The `@types/jsonwebtoken` definition omits EdDSA, but jsonwebtoken
 * handles it at runtime and the JwtAlgorithmSchema accepts it.
 */
type SupportedAlgorithm = Algorithm | 'EdDSA';

const FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_TTL_SECONDS = 3600;
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 86_400;

export interface SkippedKey {
	kid?: string;
	reason: string;
}

export interface JwksResolverResult {
	keys: ResolvedTrustedKey[];
	expiresAt: Date;
	skipped: SkippedKey[];
}

// ──────────────────────────────────────────────────────────────────────
// JWK Set Zod schemas
// ──────────────────────────────────────────────────────────────────────

const supportedAlgorithmSet = new Set<string>(JwtAlgorithmSchema.options);

/** Schema for a single JWK that we consider usable as a signing key. */
const SigningJwkSchema = z
	.object({
		kid: z.string().min(1),
		kty: z.enum(['RSA', 'EC', 'OKP']),
		alg: z.string().optional(),
		use: z
			.string()
			.optional()
			.refine((use) => use === undefined || use === 'sig', {
				message: 'Only signing keys (use: "sig" or absent) are accepted',
			}),
		crv: z.string().optional(),
	})
	.passthrough();

type SigningJwk = z.infer<typeof SigningJwkSchema>;

/** Schema for the full JWK Set response from a JWKS endpoint. */
const JwkSetSchema = z.object({
	keys: z.array(z.unknown()).min(1),
});

// ──────────────────────────────────────────────────────────────────────
// Algorithm inference
// ──────────────────────────────────────────────────────────────────────

const CURVE_TO_ALGORITHM: Record<string, SupportedAlgorithm> = {
	'P-256': 'ES256',
	'P-384': 'ES384',
	'P-521': 'ES512',
	Ed25519: 'EdDSA',
};

function inferAlgorithm(jwk: SigningJwk): SupportedAlgorithm | undefined {
	if (jwk.alg) {
		return supportedAlgorithmSet.has(jwk.alg) ? (jwk.alg as SupportedAlgorithm) : undefined;
	}

	switch (jwk.kty) {
		case 'RSA':
			return 'RS256';
		case 'EC':
		case 'OKP':
			return jwk.crv ? CURVE_TO_ALGORITHM[jwk.crv] : undefined;
		default:
			return undefined;
	}
}

// ──────────────────────────────────────────────────────────────────────
// Cache-Control parsing
// ──────────────────────────────────────────────────────────────────────

function parseMaxAge(cacheControl: string | null): number | undefined {
	if (!cacheControl) return undefined;
	const match = /max-age=(\d+)/.exec(cacheControl);
	if (!match) return undefined;
	const value = parseInt(match[1], 10);
	return Number.isNaN(value) ? undefined : value;
}

// ──────────────────────────────────────────────────────────────────────
// Resolver
// ──────────────────────────────────────────────────────────────────────

/**
 * Fetches a JWKS endpoint, converts signing keys to ResolvedTrustedKey[],
 * and determines cache expiry from Cache-Control or fallback TTL.
 */
export async function resolveJwksKeys(
	source: JwksKeySource,
	options?: {
		fetcher?: typeof fetch;
		defaultTtlSeconds?: number;
	},
): Promise<JwksResolverResult> {
	const doFetch = options?.fetcher ?? globalThis.fetch;
	const defaultTtl = options?.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
	const { url } = source;

	let response: Response;
	try {
		response = await doFetch(url, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: { Accept: 'application/json' },
			redirect: 'error',
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error';
		throw new OperationalError(`JWKS fetch failed for "${url}": ${message}`);
	}

	if (!response.ok) {
		throw new OperationalError(`JWKS fetch failed for "${url}": HTTP ${response.status}`);
	}

	let body: unknown;
	try {
		body = await response.json();
	} catch {
		throw new OperationalError(`JWKS response is not valid JSON for "${url}"`);
	}

	const jwkSetResult = JwkSetSchema.safeParse(body);
	if (!jwkSetResult.success) {
		throw new OperationalError(`JWKS response has no keys for "${url}"`);
	}

	// Compute TTL: Cache-Control max-age > source.cacheTtlSeconds > default, clamped to [60s, 24h]
	const maxAge = parseMaxAge(response.headers.get('cache-control'));
	const rawTtl = maxAge ?? source.cacheTtlSeconds ?? defaultTtl;
	const ttlSeconds = Math.max(MIN_TTL_SECONDS, Math.min(rawTtl, MAX_TTL_SECONDS));
	const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

	const keys: ResolvedTrustedKey[] = [];
	const skipped: SkippedKey[] = [];

	for (const rawJwk of jwkSetResult.data.keys) {
		const jwkResult = SigningJwkSchema.safeParse(rawJwk);
		if (!jwkResult.success) {
			const raw = rawJwk as Record<string, unknown>;
			skipped.push({
				kid: typeof raw.kid === 'string' ? raw.kid : undefined,
				reason: 'failed schema validation',
			});
			continue;
		}

		const jwk = jwkResult.data;

		const algorithm = inferAlgorithm(jwk);
		if (!algorithm) {
			skipped.push({
				kid: jwk.kid,
				reason: `unsupported algorithm or key type (kty=${jwk.kty}, alg=${jwk.alg ?? 'none'}, crv=${jwk.crv ?? 'none'})`,
			});
			continue;
		}

		let keyObject: ReturnType<typeof createPublicKey>;
		try {
			keyObject = createPublicKey({ format: 'jwk', key: jwk } as crypto.JsonWebKeyInput);
		} catch {
			skipped.push({ kid: jwk.kid, reason: 'failed to create public key from JWK material' });
			continue;
		}

		keys.push({
			kid: jwk.kid,
			algorithms: [algorithm] as Algorithm[],
			key: keyObject,
			issuer: source.issuer,
			expectedAudience: source.expectedAudience,
			allowedRoles: source.allowedRoles,
			expiresAt,
		});
	}

	if (keys.length === 0) {
		const reasons = skipped.map((s) => `${s.kid ?? 'unknown'}: ${s.reason}`).join('; ');
		throw new OperationalError(
			`JWKS response has no usable signing keys for "${url}" (${reasons})`,
		);
	}

	return { keys, expiresAt, skipped };
}
