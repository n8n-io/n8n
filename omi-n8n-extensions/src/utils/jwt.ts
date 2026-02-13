/**
 * JWT utilities for OmiGroup extensions.
 *
 * Creates JWTs that are 100% compatible with n8n's auth middleware.
 *
 * n8n's AuthService (packages/cli/src/auth/auth.service.ts) creates JWTs with:
 *   payload: { id, hash, browserId?, usedMfa? }
 *   where hash = SHA256(email:password[:mfaSecret[0:3]]).base64().substring(0, 10)
 *   signed with HS256 using N8N_USER_MANAGEMENT_JWT_SECRET
 *   expiresIn: jwtSessionDurationHours * 3600 (seconds)
 *
 * n8n validates by:
 *   1. Verifying JWT signature
 *   2. Checking token not in invalid_auth_token table
 *   3. Looking up user by payload.id
 *   4. Checking user is not disabled
 *   5. Comparing payload.hash with createJWTHash(user) — MUST MATCH
 *   6. Optionally validating browserId
 */

import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { getConfig } from '../config';

/**
 * JWT payload format that n8n's auth middleware expects.
 * Must match AuthJwtPayload from n8n's codebase exactly.
 */
export interface N8nAuthJwtPayload {
	/** User ID (UUID) */
	id: string;
	/** Hash of user credentials: SHA256(email:password).base64().substring(0, 10) */
	hash: string;
	/** Hashed browser ID for session binding (optional) */
	browserId?: string;
	/** Whether MFA was used during authentication */
	usedMfa?: boolean;
}

/**
 * Create the JWT hash exactly as n8n does.
 *
 * n8n's AuthService.createJWTHash():
 *   const payload = [email, password];
 *   if (mfaEnabled && mfaSecret) payload.push(mfaSecret.substring(0, 3));
 *   return SHA256(payload.join(':')).base64().substring(0, 10);
 *
 * Since SSO users don't have MFA, we only use email:password.
 */
export function createJwtHash(email: string, passwordHash: string): string {
	const payload = [email, passwordHash].join(':');
	return createHash('sha256').update(payload).digest('base64').substring(0, 10);
}

/**
 * Hash a string using SHA256 → base64 (same as n8n's internal hash function).
 */
function sha256Base64(input: string): string {
	return createHash('sha256').update(input).digest('base64');
}

/**
 * Create a JWT token compatible with n8n's auth system.
 *
 * @param user - User data needed for JWT creation
 * @param browserId - Optional browser ID from request header
 * @returns JWT token string
 */
export function createN8nCompatibleJwt(user: {
	id: string;
	email: string;
	password: string;
}, browserId?: string): string {
	const config = getConfig();
	const durationHours = parseInt(
		process.env.N8N_USER_MANAGEMENT_JWT_DURATION_HOURS ?? '168',
		10,
	);

	const payload: N8nAuthJwtPayload = {
		id: user.id,
		hash: createJwtHash(user.email, user.password),
		usedMfa: false,
	};

	// Hash the browserId if provided (same as n8n does)
	if (browserId) {
		payload.browserId = sha256Base64(browserId);
	}

	// n8n uses expiresIn in SECONDS, not string format
	return jwt.sign(payload, config.n8n.jwtSecret, {
		expiresIn: durationHours * 3600,
	});
}

/**
 * Verify a JWT token and return the payload.
 * Returns null if token is invalid or expired.
 */
export function verifyJwt(token: string): N8nAuthJwtPayload | null {
	try {
		const config = getConfig();
		return jwt.verify(token, config.n8n.jwtSecret) as N8nAuthJwtPayload;
	} catch {
		return null;
	}
}

/**
 * n8n's AUTH_COOKIE_NAME constant value.
 */
export const AUTH_COOKIE_NAME = 'n8n-auth';
