/**
 * Utilities for interacting with n8n's own database.
 *
 * We access n8n's DB through the hook context (this.dbCollections)
 * which provides TypeORM repositories for User, Settings, Credentials, Workflow.
 *
 * IMPORTANT: We never modify n8n's schema. We only read/write through
 * n8n's existing repositories and entities.
 */

import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

/** bcrypt salt rounds — n8n uses 10 rounds (bcryptjs default) */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Minimal User interface matching n8n's User entity fields
 * that we need for SSO operations.
 *
 * n8n's User entity stores:
 * - id: UUID string
 * - email: lowercase string
 * - firstName, lastName: string
 * - password: bcrypt hash string (e.g. "$2a$10$...")
 * - role: 'global:owner' | 'global:admin' | 'global:member'
 * - disabled: boolean
 * - mfaEnabled: boolean
 * - mfaSecret: string | null
 */
export interface N8nUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	password: string;
	role: 'global:owner' | 'global:admin' | 'global:member';
	disabled: boolean;
	mfaEnabled?: boolean;
	mfaSecret?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Hook context database collections provided by n8n's ExternalHooks.
 *
 * Available via `this.dbCollections` inside hook functions.
 * These are TypeORM repositories with standard find/save/update methods.
 */
export interface HookDbCollections {
	User: {
		findOne: (options: { where: Record<string, unknown> }) => Promise<N8nUser | null>;
		find: (options?: Record<string, unknown>) => Promise<N8nUser[]>;
		save: (entity: Partial<N8nUser>) => Promise<N8nUser>;
		update: (criteria: Record<string, unknown>, data: Partial<N8nUser>) => Promise<unknown>;
	};
	Settings: {
		findOne: (options: { where: Record<string, unknown> }) => Promise<{ key: string; value: string } | null>;
		save: (entity: { key: string; value: string }) => Promise<unknown>;
	};
	Credentials: Record<string, unknown>;
	Workflow: Record<string, unknown>;
}

/**
 * Generate a UUID for new n8n users.
 */
export function generateUserId(): string {
	return uuid();
}

/**
 * Generate a bcrypt-hashed random password for SSO users.
 *
 * SSO users don't use password login, but n8n requires a valid bcrypt hash
 * in the password column. The hash is also used in JWT hash computation:
 *   jwtHash = SHA256(email + ":" + bcryptHash).base64().substring(0, 10)
 *
 * This password is random and never exposed to the user. It serves as:
 * 1. A required non-empty field for n8n's User entity
 * 2. Part of the JWT invalidation mechanism (changing password = all tokens invalid)
 *
 * @returns bcrypt hash string (e.g. "$2a$10$...")
 */
export async function generateSsoPasswordHash(): Promise<string> {
	const randomPassword = randomBytes(32).toString('hex');
	return bcrypt.hash(randomPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Synchronous version for cases where async is not feasible.
 * Prefer the async version when available.
 */
export function generateSsoPasswordHashSync(): string {
	const randomPassword = randomBytes(32).toString('hex');
	return bcrypt.hashSync(randomPassword, BCRYPT_SALT_ROUNDS);
}
