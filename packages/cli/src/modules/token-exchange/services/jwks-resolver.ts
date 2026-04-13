import type crypto from 'node:crypto';
import { createPublicKey } from 'node:crypto';

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Algorithm } from 'jsonwebtoken';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import type { JwksKeySource } from '../token-exchange.schemas';
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

/** A resolved JWKS key with PEM-encoded key material, ready for DB persistence. */
export interface JwksResolvedKey {
	kid: string;
	algorithms: string[];
	keyMaterial: string;
	issuer: string;
	expectedAudience?: string;
	allowedRoles?: string[];
}

export interface JwksResolverResult {
	keys: JwksResolvedKey[];
	ttlSeconds: number;
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
// Service
// ──────────────────────────────────────────────────────────────────────

/**
 * Fetches JWKS endpoints, converts signing keys to PEM-encoded material,
 * and determines cache expiry from Cache-Control or fallback TTL.
 */
@Service()
export class JwksResolverService {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger.scoped('token-exchange');
	}

	async resolveKeys(
		source: JwksKeySource,
		options?: {
			fetcher?: typeof fetch;
			defaultTtlSeconds?: number;
		},
	): Promise<JwksResolverResult> {
		const fetcher = options?.fetcher ?? globalThis.fetch;
		const defaultTtl = options?.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
		const { url } = source;

		this.logger.debug(`Fetching JWKS from "${url}"`);

		const { rawKeys, cacheControl } = await this.fetchJwkSet(url, fetcher);
		const ttlSeconds = this.computeTtl(cacheControl, source, defaultTtl);

		const keys: JwksResolvedKey[] = [];
		const skipped: SkippedKey[] = [];

		for (const rawJwk of rawKeys) {
			const result = this.parseJwk(rawJwk, source);
			if ('resolved' in result) {
				keys.push(result.resolved);
			} else {
				skipped.push(result.skipped);
			}
		}

		if (keys.length === 0) {
			const reasons = skipped.map((s) => `${s.kid ?? 'unknown'}: ${s.reason}`).join('; ');
			throw new OperationalError(
				`JWKS response has no usable signing keys for "${url}" (${reasons})`,
			);
		}

		this.logger.debug(`Resolved ${keys.length} key(s) from "${url}"`, {
			resolved: keys.length,
			skipped: skipped.length,
			ttlSeconds,
		});

		return { keys, ttlSeconds, skipped };
	}

	// ─── Private helpers ──────────────────────────────────────────────

	/** Fetch the JWKS endpoint, validate the response, and return raw keys. */
	private async fetchJwkSet(
		url: string,
		fetcher: typeof fetch,
	): Promise<{ rawKeys: unknown[]; cacheControl: string | null }> {
		let response: Response;
		try {
			response = await fetcher(url, {
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

		return {
			rawKeys: jwkSetResult.data.keys,
			cacheControl: response.headers.get('cache-control'),
		};
	}

	/** Parse and validate a single raw JWK entry from the key set. */
	private parseJwk(
		rawJwk: unknown,
		source: JwksKeySource,
	): { resolved: JwksResolvedKey } | { skipped: SkippedKey } {
		if (rawJwk === null || typeof rawJwk !== 'object') {
			return { skipped: { kid: undefined, reason: 'not an object' } };
		}

		const jwkResult = SigningJwkSchema.safeParse(rawJwk);
		if (!jwkResult.success) {
			const raw = rawJwk as Record<string, unknown>;
			return {
				skipped: {
					kid: typeof raw.kid === 'string' ? raw.kid : undefined,
					reason: 'failed schema validation',
				},
			};
		}

		const jwk = jwkResult.data;

		const algorithm = inferAlgorithm(jwk);
		if (!algorithm) {
			return {
				skipped: {
					kid: jwk.kid,
					reason: `unsupported algorithm or key type (kty=${jwk.kty}, alg=${jwk.alg ?? 'none'}, crv=${jwk.crv ?? 'none'})`,
				},
			};
		}

		let keyObject: ReturnType<typeof createPublicKey>;
		try {
			keyObject = createPublicKey({ format: 'jwk', key: jwk } as crypto.JsonWebKeyInput);
		} catch {
			return {
				skipped: { kid: jwk.kid, reason: 'failed to create public key from JWK material' },
			};
		}

		return {
			resolved: {
				kid: jwk.kid,
				algorithms: [algorithm],
				keyMaterial: keyObject.export({ type: 'spki', format: 'pem' }) as string,
				issuer: source.issuer,
				expectedAudience: source.expectedAudience,
				allowedRoles: source.allowedRoles,
			},
		};
	}

	/** Compute TTL: Cache-Control max-age > source.cacheTtlSeconds > default, clamped to [60s, 24h]. */
	private computeTtl(
		cacheControl: string | null,
		source: JwksKeySource,
		defaultTtl: number,
	): number {
		const maxAge = parseMaxAge(cacheControl);
		const rawTtl = maxAge ?? source.cacheTtlSeconds ?? defaultTtl;
		return Math.max(MIN_TTL_SECONDS, Math.min(rawTtl, MAX_TTL_SECONDS));
	}
}
