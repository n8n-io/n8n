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

import { EventService } from '@/events/event.service';
import { UserService } from '@/services/user.service';

import { TokenExchangeAuthError } from '../token-exchange.errors';
import type { ExternalTokenClaims } from '../token-exchange.schemas';
import { TokenExchangeFailureReason } from '../token-exchange.types';

/**
 * Password placeholder for JIT-provisioned users. This is not a valid bcrypt
 * hash, so it can never match any input — the user can only authenticate
 * through token exchange.
 */
const INVALID_PASSWORD_PLACEHOLDER = '!token-exchange-no-password';

/** Maximum length for first/last name columns in the database. */
const MAX_NAME_LENGTH = 32;

type GlobalRoleKey = keyof typeof GLOBAL_ROLES;

function isGlobalRole(role: string): role is GlobalRoleKey {
	return role in GLOBAL_ROLES;
}

function trimName(value: string | undefined, fallback = ''): string {
	return (value ?? fallback).slice(0, MAX_NAME_LENGTH);
}

@Service()
export class IdentityResolutionService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
		private readonly eventService: EventService,
		private readonly userService: UserService,
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
	 * permitted by the key's allowedRoles. A disallowed role claim throws —
	 * OAuth flows are strict to avoid silent misconfiguration.
	 */
	async resolve(
		claims: ExternalTokenClaims,
		allowedRoles?: string[],
		tokenContext?: { kid: string; issuer: string },
	): Promise<User> {
		const email = claims.email?.toLowerCase();

		// Path 1: known sub
		const identity = await this.authIdentityRepository.findOne({
			where: { providerId: claims.sub, providerType: 'token-exchange' },
			relations: { user: { role: true } },
		});

		if (identity) {
			return await this.resolveByIdentity(claims, identity, allowedRoles, tokenContext);
		}

		// Path 2: email fallback
		if (email) {
			const existingUser = await this.userRepository.findOne({
				where: { email },
				relations: ['authIdentities', 'role'],
			});

			if (existingUser) {
				return await this.resolveByEmail(claims, email, existingUser, allowedRoles, tokenContext);
			}
		}

		// Path 3: JIT provisioning
		if (!email) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.InvalidClaims,
				'Email claim is required for user provisioning',
			);
		}

		return await this.provisionUser(claims, email, allowedRoles, tokenContext);
	}

	/** Path 1: resolve an already-linked identity and sync profile/role. */
	private async resolveByIdentity(
		claims: ExternalTokenClaims,
		identity: AuthIdentity,
		allowedRoles: string[] | undefined,
		tokenContext: { kid: string; issuer: string } | undefined,
	): Promise<User> {
		this.logger.debug('Resolved user by auth identity', { sub: claims.sub });
		const resolvedRole = this.resolveRoleForExistingUser(
			claims.role,
			allowedRoles,
			identity.user.role?.slug,
		);
		return await this.syncProfile(identity.user, claims, resolvedRole, tokenContext);
	}

	/** Path 2: link an external identity to an existing user found by email. */
	private async resolveByEmail(
		claims: ExternalTokenClaims,
		email: string,
		existingUser: User,
		allowedRoles: string[] | undefined,
		tokenContext: { kid: string; issuer: string } | undefined,
	): Promise<User> {
		this.logger.debug('Linking external identity to existing user by email', {
			sub: claims.sub,
			email,
		});
		const resolvedRole = this.resolveRoleForExistingUser(
			claims.role,
			allowedRoles,
			existingUser.role?.slug,
		);
		await this.authIdentityRepository.save(
			AuthIdentity.create(existingUser, claims.sub, 'token-exchange'),
		);
		this.eventService.emit('token-exchange-identity-linked', {
			userId: existingUser.id,
			sub: claims.sub,
			email,
			kid: tokenContext?.kid ?? '',
			issuer: tokenContext?.issuer ?? claims.iss,
		});
		return await this.syncProfile(existingUser, claims, resolvedRole, tokenContext);
	}

	/** Path 3: JIT-provision a new user with a personal project and identity link. */
	private async provisionUser(
		claims: ExternalTokenClaims,
		email: string,
		allowedRoles: string[] | undefined,
		tokenContext: { kid: string; issuer: string } | undefined,
	): Promise<User> {
		this.logger.debug('JIT provisioning new user', { sub: claims.sub, email });

		const jitRole = this.resolveRoleForNewUser(claims.role, allowedRoles);
		const targetRole = jitRole ? { slug: jitRole } : GLOBAL_MEMBER_ROLE;

		const user = await this.userRepository.manager.transaction(async (trx) => {
			const { user: newUser } = await this.userRepository.createUserWithProject(
				{
					email,
					firstName: trimName(claims.given_name),
					lastName: trimName(claims.family_name),
					role: targetRole,
					password: INVALID_PASSWORD_PLACEHOLDER,
				},
				trx,
			);

			await trx.save(
				trx.create(AuthIdentity, {
					providerId: claims.sub,
					providerType: 'token-exchange',
					userId: newUser.id,
				}),
			);

			return newUser;
		});

		this.eventService.emit('token-exchange-user-provisioned', {
			userId: user.id,
			sub: claims.sub,
			email,
			role: targetRole.slug,
			kid: tokenContext?.kid ?? '',
			issuer: tokenContext?.issuer ?? claims.iss,
		});

		return user;
	}

	/**
	 * Resolve the role claim for an existing user.
	 *
	 * Returns the role slug to sync to, or `undefined` to keep the current
	 * role unchanged. Throws when the claimed role is valid but not permitted
	 * by the key's allowedRoles — OAuth flows must be strict to surface
	 * misconfiguration early.
	 */
	private resolveRoleForExistingUser(
		roleClaim: ExternalTokenClaims['role'],
		allowedRoles: string[] | undefined,
		currentRole: string | undefined,
	): GlobalRoleKey | undefined {
		if (roleClaim === undefined) return undefined;

		// Never modify the role of an existing owner via token exchange
		if (currentRole === 'global:owner') {
			this.logger.debug('Skipping role sync for existing owner');
			return undefined;
		}

		const role = roleClaim;

		// Never change a user's role to global:owner via token exchange
		if (role === 'global:owner') {
			this.logger.warn('Ignoring global:owner role claim for existing user');
			return undefined;
		}

		if (!isGlobalRole(role)) {
			this.logger.warn('Unknown role claim ignored', { role });
			return undefined;
		}

		if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				`Role '${role}' is not allowed for this token exchange key`,
			);
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

		const role = roleClaim;

		if (role === 'global:owner') {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				'Cannot provision global:owner role via token exchange',
			);
		}

		if (!isGlobalRole(role)) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				`Unrecognized role '${role}' cannot be assigned to new user`,
			);
		}

		if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				`Role '${role}' is not allowed for this token exchange key`,
			);
		}

		return role;
	}

	/**
	 * Sync profile fields and role from claims to user when present and changed.
	 * Uses `UserService.changeUserRole` for role changes to ensure side effects
	 * (API key revocation, project relation cleanup, cache invalidation) are applied.
	 */
	private async syncProfile(
		user: User,
		claims: ExternalTokenClaims,
		resolvedRole?: GlobalRoleKey,
		tokenContext?: { kid: string; issuer: string },
	): Promise<User> {
		let needsReload = false;

		// Sync profile fields (firstName, lastName)
		const profileUpdates: Pick<Partial<User>, 'firstName' | 'lastName'> = {};

		if (claims.given_name !== undefined) {
			const trimmed = trimName(claims.given_name);
			if (trimmed !== user.firstName) {
				profileUpdates.firstName = trimmed;
			}
		}

		if (claims.family_name !== undefined) {
			const trimmed = trimName(claims.family_name);
			if (trimmed !== user.lastName) {
				profileUpdates.lastName = trimmed;
			}
		}

		if (Object.keys(profileUpdates).length > 0) {
			await this.userRepository.update(user.id, profileUpdates);
			needsReload = true;
		}

		// Sync role via UserService.changeUserRole for proper side effects
		const previousRole = user.role?.slug;
		if (resolvedRole && resolvedRole !== previousRole) {
			await this.userService.changeUserRole(user, { newRoleName: resolvedRole });
			needsReload = true;

			if (previousRole) {
				this.eventService.emit('token-exchange-role-updated', {
					userId: user.id,
					previousRole,
					newRole: resolvedRole,
					kid: tokenContext?.kid ?? '',
					issuer: tokenContext?.issuer ?? claims.iss,
				});
			}
		}

		if (needsReload) {
			return await this.userRepository.findOneOrFail({
				where: { id: user.id },
				relations: ['role'],
			});
		}

		return user;
	}
}
