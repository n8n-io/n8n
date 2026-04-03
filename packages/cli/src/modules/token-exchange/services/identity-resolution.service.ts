import { Logger } from '@n8n/backend-common';
import {
	AuthIdentity,
	AuthIdentityRepository,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_ROLES,
	UserRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { AuthError } from '@/errors/response-errors/auth.error';

import type { ExternalTokenClaims } from '../token-exchange.schemas';

/**
 * Password placeholder for JIT-provisioned users. This is not a valid bcrypt
 * hash, so it can never match any input — the user can only authenticate
 * through token exchange.
 */
const INVALID_PASSWORD_PLACEHOLDER = '!token-exchange-no-password';

type GlobalRoleKey = keyof typeof GLOBAL_ROLES;

function isGlobalRole(role: string): role is GlobalRoleKey {
	return role in GLOBAL_ROLES;
}

@Service()
export class IdentityResolutionService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	/**
	 * Map external identity claims to a local n8n user, creating one if necessary.
	 *
	 * Resolution order:
	 * 1. AuthIdentity lookup by sub + token-exchange provider
	 * 2. Email fallback — link existing user to this sub
	 * 3. JIT provision — create user + personal project + identity in a transaction
	 *
	 * Role handling: the role claim is only applied when it is both valid and
	 * permitted by the key's allowedRoles. For existing users the current role
	 * is preserved when the claimed role is disallowed or absent — login is
	 * never blocked because of a role mismatch.
	 */
	async resolve(claims: ExternalTokenClaims, allowedRoles?: string[]): Promise<User> {
		// Path 1: known sub
		const identity = await this.authIdentityRepository.findOne({
			where: { providerId: claims.sub, providerType: 'token-exchange' },
			relations: { user: { role: true } },
		});

		if (identity) {
			this.logger.debug('Resolved user by auth identity', { sub: claims.sub });
			const resolvedRole = this.resolveRoleForExistingUser(
				claims.role,
				allowedRoles,
				identity.user.role?.slug,
			);
			return await this.syncProfile(identity.user, claims, resolvedRole);
		}

		// Path 2: email fallback
		if (claims.email) {
			const existingUser = await this.userRepository.findOne({
				where: { email: claims.email },
				relations: ['authIdentities', 'role'],
			});

			if (existingUser) {
				this.logger.debug('Linking external identity to existing user by email', {
					sub: claims.sub,
					email: claims.email,
				});
				await this.authIdentityRepository.save(
					AuthIdentity.create(existingUser, claims.sub, 'token-exchange'),
				);
				const resolvedRole = this.resolveRoleForExistingUser(
					claims.role,
					allowedRoles,
					existingUser.role?.slug,
				);
				return await this.syncProfile(existingUser, claims, resolvedRole);
			}
		}

		// Path 3: JIT provisioning
		if (!claims.email) {
			throw new AuthError('Email claim is required for user provisioning');
		}

		this.logger.debug('JIT provisioning new user', {
			sub: claims.sub,
			email: claims.email,
		});

		const jitRole = this.resolveRoleForNewUser(claims.role, allowedRoles);
		const targetRole = jitRole ? { slug: jitRole } : GLOBAL_MEMBER_ROLE;

		return await this.userRepository.manager.transaction(async (trx) => {
			const { user } = await this.userRepository.createUserWithProject(
				{
					email: claims.email,
					firstName: claims.given_name ?? '',
					lastName: claims.family_name ?? '',
					role: targetRole,
					password: INVALID_PASSWORD_PLACEHOLDER,
				},
				trx,
			);

			await trx.save(
				trx.create(AuthIdentity, {
					providerId: claims.sub,
					providerType: 'token-exchange' as const,
					userId: user.id,
				}),
			);

			return user;
		});
	}

	/**
	 * Resolve the role claim for an existing user.
	 *
	 * Returns the role slug to sync to, or `undefined` to keep the current
	 * role unchanged. Existing users are never blocked from logging in — if
	 * the claimed role is invalid or not allowed, we simply skip the role
	 * update and let them keep their current role.
	 */
	private resolveRoleForExistingUser(
		roleClaim: ExternalTokenClaims['role'],
		allowedRoles: string[] | undefined,
		currentRole: string | undefined,
	): GlobalRoleKey | undefined {
		if (roleClaim === undefined) return undefined;

		const role = Array.isArray(roleClaim) ? roleClaim[0] : roleClaim;

		// Never change a user's role to global:owner via token exchange
		if (role === 'global:owner') {
			this.logger.warn('Ignoring global:owner role claim for existing user');
			return undefined;
		}

		if (!isGlobalRole(role)) {
			this.logger.warn('Unknown role claim ignored', { role });
			return undefined;
		}

		// If the claimed role is not in the allowed list, skip the update
		if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
			this.logger.debug('Role claim not in allowedRoles, keeping current role', {
				claimed: role,
				current: currentRole,
			});
			return undefined;
		}

		return role;
	}

	/**
	 * Resolve the role claim for a new (JIT-provisioned) user.
	 *
	 * Returns the role slug to provision with, or `undefined` to default to
	 * `global:member`. Unlike existing users, invalid or disallowed roles
	 * throw because we have no fallback role to preserve.
	 */
	private resolveRoleForNewUser(
		roleClaim: ExternalTokenClaims['role'],
		allowedRoles: string[] | undefined,
	): GlobalRoleKey | undefined {
		if (roleClaim === undefined) return undefined;

		const role = Array.isArray(roleClaim) ? roleClaim[0] : roleClaim;

		if (role === 'global:owner') {
			throw new AuthError('Cannot provision global:owner role via token exchange');
		}

		if (!isGlobalRole(role)) {
			this.logger.warn('Unknown role claim ignored for new user', { role });
			return undefined;
		}

		if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
			throw new AuthError(`Role '${role}' is not allowed for this token exchange key`);
		}

		return role;
	}

	/**
	 * Sync profile fields from claims to user when present and changed.
	 * Returns the user (potentially refreshed from the save operation).
	 */
	private async syncProfile(
		user: User,
		claims: ExternalTokenClaims,
		resolvedRole?: GlobalRoleKey,
	): Promise<User> {
		const updates: Record<string, unknown> = {};

		if (claims.given_name !== undefined && claims.given_name !== user.firstName) {
			updates.firstName = claims.given_name;
		}

		if (claims.family_name !== undefined && claims.family_name !== user.lastName) {
			updates.lastName = claims.family_name;
		}

		if (resolvedRole && resolvedRole !== user.role?.slug) {
			updates.role = GLOBAL_ROLES[resolvedRole];
		}

		if (Object.keys(updates).length > 0) {
			await this.userRepository.update(user.id, updates);
			return await this.userRepository.findOneOrFail({
				where: { id: user.id },
				relations: ['role'],
			});
		}

		return user;
	}
}
