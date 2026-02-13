/**
 * Authentication & Authorization middleware for OmiGroup routes.
 *
 * Verifies that the request comes from an authenticated n8n user
 * by reading the n8n-auth cookie and verifying the JWT.
 *
 * Since n8n's JWT payload only contains { id, hash, browserId?, usedMfa? }
 * (no email), we need to look up the user by ID to get email and role.
 * We cache user lookups to avoid repeated DB queries per request.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, createJwtHash, AUTH_COOKIE_NAME } from '../utils/jwt';
import { getConfig } from '../config';
import type { N8nUser, HookDbCollections } from '../utils/n8n-db';

/** Resolved user info attached to requests by auth middleware */
export interface OmiRequestUser {
	id: string;
	email: string;
	role: string;
	firstName: string;
	lastName: string;
}

/** Reference to n8n's User repository, set during initialization */
let _userRepo: HookDbCollections['User'] | null = null;

/** Simple in-memory user cache to avoid DB lookups on every request */
const _userCache = new Map<string, { user: N8nUser; expiresAt: number }>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize auth-guard with n8n's User repository.
 * Must be called before any middleware is invoked.
 */
export function initAuthGuard(userRepo: HookDbCollections['User']): void {
	_userRepo = userRepo;
}

/**
 * Look up a user by ID with caching.
 */
async function lookupUser(userId: string): Promise<N8nUser | null> {
	// Check cache first
	const cached = _userCache.get(userId);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.user;
	}

	if (!_userRepo) return null;

	const user = await _userRepo.findOne({ where: { id: userId } });
	if (user) {
		_userCache.set(userId, {
			user,
			expiresAt: Date.now() + USER_CACHE_TTL_MS,
		});
	}

	return user;
}

/**
 * Extract, verify the JWT, and resolve the full user from the n8n auth cookie.
 *
 * Validation steps (mirrors n8n's AuthService.resolveJwt):
 * 1. Read n8n-auth cookie
 * 2. Verify JWT signature and expiration
 * 3. Look up user by payload.id
 * 4. Check user is not disabled
 * 5. Verify payload.hash matches current user data
 *
 * Returns resolved user or null if any check fails.
 */
export async function getCurrentUser(req: Request): Promise<OmiRequestUser | null> {
	const token = req.cookies?.[AUTH_COOKIE_NAME];
	if (!token) return null;

	const payload = verifyJwt(token);
	if (!payload) return null;

	// Look up user in n8n's DB
	const user = await lookupUser(payload.id);
	if (!user) return null;
	if (user.disabled) return null;

	// Verify JWT hash matches current user data
	// This ensures the token is invalidated if the user's password changes
	const expectedHash = createJwtHash(user.email, user.password);
	if (payload.hash !== expectedHash) return null;

	return {
		id: user.id,
		email: user.email,
		role: user.role,
		firstName: user.firstName,
		lastName: user.lastName,
	};
}

/**
 * Middleware: Verify that the request is from an authenticated n8n user.
 */
export function verifyAuthenticated(req: Request, res: Response, next: NextFunction): void {
	getCurrentUser(req)
		.then((user) => {
			if (!user) {
				res.status(401).json({ error: 'Authentication required' });
				return;
			}

			// Attach user info to request for downstream handlers
			(req as Record<string, unknown>).omiUser = user;
			next();
		})
		.catch((err) => {
			console.error('[OmiGroup] Auth verification error:', err);
			res.status(500).json({ error: 'Internal authentication error' });
		});
}

/**
 * Middleware: Verify that the request is from an OmiGroup admin.
 *
 * Admin is determined by:
 * 1. Email is in OMI_ADMIN_EMAILS env var, OR
 * 2. User has 'global:owner' or 'global:admin' role in n8n
 */
export function verifyOmiAdmin(req: Request, res: Response, next: NextFunction): void {
	getCurrentUser(req)
		.then((user) => {
			if (!user) {
				res.status(401).json({ error: 'Authentication required' });
				return;
			}

			const config = getConfig();
			const isAdminByEmail = config.admin.emails.includes(user.email.toLowerCase());
			const isAdminByRole = user.role === 'global:owner' || user.role === 'global:admin';

			if (!isAdminByEmail && !isAdminByRole) {
				res.status(403).json({ error: 'Admin access required' });
				return;
			}

			(req as Record<string, unknown>).omiUser = user;
			next();
		})
		.catch((err) => {
			console.error('[OmiGroup] Admin verification error:', err);
			res.status(500).json({ error: 'Internal authentication error' });
		});
}

/**
 * Get the OmiGroup user from the request (set by auth middleware).
 */
export function getOmiUser(req: Request): OmiRequestUser | null {
	return (req as Record<string, unknown>).omiUser as OmiRequestUser | null;
}

/**
 * Clear the user cache. Useful for testing or when user data changes.
 */
export function clearUserCache(): void {
	_userCache.clear();
}
