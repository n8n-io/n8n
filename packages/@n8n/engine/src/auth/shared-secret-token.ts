import jwt from 'jsonwebtoken';
import type { z } from 'zod';

/**
 * Floor for a shared secret. One value authenticates a whole plane, so a
 * guessable secret is a full bypass.
 */
export const MIN_SECRET_LENGTH = 32;

/** Everything that distinguishes one shared-secret token type from another. */
export interface SharedSecretTokenSpec {
	readonly issuer: string;
	readonly audience: string;
	readonly ttlSeconds: number;
	readonly clockToleranceSeconds: number;
}

export function signSharedSecretToken(
	spec: SharedSecretTokenSpec,
	secret: string,
	claims: object,
): string {
	return jwt.sign(claims, secret, {
		algorithm: 'HS256',
		issuer: spec.issuer,
		audience: spec.audience,
		expiresIn: spec.ttlSeconds,
	});
}

/**
 * The claims the token proves, or `undefined` for any rejection — one outcome
 * for every failure, so no caller can tell which check failed.
 *
 * Fails closed on an under-length secret rather than throwing: a secret can be
 * generated after the verifying code is constructed, so "not configured yet" and
 * "token is bad" must look the same to a caller.
 */
export function verifySharedSecretToken<T extends { iat: number }>(
	spec: SharedSecretTokenSpec,
	secret: string,
	token: string,
	schema: z.ZodType<T>,
): T | undefined {
	if (!secret || secret.length < MIN_SECRET_LENGTH) return undefined;

	const now = Math.floor(Date.now() / 1000);
	let claims: unknown;
	try {
		// `algorithms` is pinned: an unpinned verify accepts whatever `alg` the
		// token names, including `none`. `clockTolerance` allows for clock skew
		// between the CP and DP hosts.
		claims = jwt.verify(token, secret, {
			algorithms: ['HS256'],
			issuer: spec.issuer,
			audience: spec.audience,
			maxAge: spec.ttlSeconds,
			clockTolerance: spec.clockToleranceSeconds,
			clockTimestamp: now,
		});
	} catch {
		return undefined;
	}

	const parsed = schema.safeParse(claims);
	if (!parsed.success) return undefined;
	// `maxAge` bounds how old a token may be; this bounds how far in the future
	// it may claim to have been issued.
	if (parsed.data.iat > now + spec.clockToleranceSeconds) return undefined;

	return parsed.data;
}
