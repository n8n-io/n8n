import { Logger } from '@n8n/backend-common';
import { AuthIdentityRepository, GLOBAL_MEMBER_ROLE, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { GLOBAL_OWNER_ROLE_SLUG, isBuiltInRole } from '@n8n/permissions';
import { createHash } from 'node:crypto';

import { EventService } from '@/events/event.service';
import { TrustedKeyService } from '@/modules/identity-substrate/services/trusted-key.service';
import {
	IdentityBindingService,
	interpretEmailVerified,
} from '@/services/identity-binding.service';
import {
	IdentityResolutionError,
	type IdentityPolicy,
	type IdentitySource,
} from '@/services/identity-binding.types';
import type { IdentityResolver } from '@/services/identity-resolution-proxy.service';
import { RoleService } from '@/services/role.service';
import { UserService } from '@/services/user.service';

import { TokenExchangeConfig } from '../token-exchange.config';
import { TokenExchangeAuthError } from '../token-exchange.errors';
import type { ExternalTokenClaims } from '../token-exchange.schemas';
import { TokenExchangeFailureReason } from '../token-exchange.types';

type TokenContext = { kid?: string; issuer: string; requireVerifiedEmail?: boolean };

export function qualifiedProviderId(issuer: string, sub: string): string {
	return `${createHash('sha256').update(issuer).digest('hex')}::${sub}`;
}

/**
 * Adapter binding token-exchange's policy — per-key `allowedRoles`,
 * `excludeOwner`, the `role` claim and `requireVerifiedEmail` — to the shared
 * resolution algorithm in `IdentityBindingService`. The three-path lookup,
 * linking and provisioning all live there; this class owns only the decisions
 * that are specific to a token-exchange key.
 */
@Service()
export class IdentityResolutionService implements IdentityResolver {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
		private readonly eventService: EventService,
		private readonly userService: UserService,
		private readonly trustedKeyService: TrustedKeyService,
		private readonly roleService: RoleService,
		private readonly config: TokenExchangeConfig,
		private readonly identityBinding: IdentityBindingService,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	/**
	 * Map external identity claims to a local n8n user.
	 *
	 * `allowProvisioning: true` (login/exchange flows) — creates a user if
	 * necessary. `allowProvisioning: false` (per-access resolution) — a cheap,
	 * read-only, indexed lookup only, returning `null` when there is no active
	 * binding: a trigger must never create a user, and an unbound identity must
	 * not block execution.
	 *
	 * Role handling: the role claim is only applied when it is both valid and
	 * permitted by the key's allowedRoles. A disallowed role claim throws —
	 * OAuth flows are strict to avoid silent misconfiguration.
	 */
	async resolve(
		claims: ExternalTokenClaims,
		allowedRoles: string[] | undefined,
		tokenContext: TokenContext,
		allowProvisioning: true,
	): Promise<User>;
	async resolve(
		claims: ExternalTokenClaims,
		allowedRoles: string[] | undefined,
		tokenContext: TokenContext,
		allowProvisioning: boolean,
	): Promise<User | null>;
	async resolve(
		claims: ExternalTokenClaims,
		allowedRoles: string[] | undefined,
		tokenContext: TokenContext,
		allowProvisioning: boolean,
	): Promise<User | null> {
		try {
			return await this.identityBinding.resolve(
				this.buildSource(claims, tokenContext),
				claims,
				this.buildPolicy(allowedRoles, tokenContext),
				{ allowProvisioning },
			);
		} catch (error) {
			// Re-map the shared core's errors onto this module's error type.
			if (error instanceof IdentityResolutionError) {
				throw error.failure === 'missing-email'
					? new TokenExchangeAuthError(
							TokenExchangeFailureReason.InvalidClaims,
							'Email claim is required for user provisioning',
						)
					: new TokenExchangeAuthError(
							TokenExchangeFailureReason.Other,
							'This identity binding is no longer active',
						);
			}
			throw error;
		}
	}

	/**
	 * Bindings are keyed by `sha256(iss)::sub`, so the same `sub` from two
	 * issuers can never collide. Two fallbacks cover rows written before that:
	 * the unqualified sub, and — for the instance's own SSO provider — the
	 * `oidc` row that already exists for anyone who has logged in through SSO.
	 * The bridge is last so it can never shadow a token-exchange binding.
	 */
	private buildSource(claims: ExternalTokenClaims, tokenContext: TokenContext): IdentitySource {
		const qualifiedSub = qualifiedProviderId(claims.iss, claims.sub);

		return {
			providerType: 'token-exchange',
			keyFor: () => qualifiedSub,
			fallbacks: [
				{
					providerId: claims.sub,
					providerType: 'token-exchange',
					// An unqualified sub is only unambiguous when there is a single
					// trusted issuer; with more than one, treat it as not found.
					accepts: async () => await this.trustedKeyService.hasSingleTrustedIssuer(),
					rebind: async (identity) => {
						await this.authIdentityRepository.update(
							{ providerId: claims.sub, providerType: 'token-exchange' },
							{ providerId: qualifiedSub },
						);
						this.eventService.emit('token-exchange-identity-rebound', {
							userId: identity.user.id,
							sub: claims.sub,
							kid: tokenContext.kid ?? '',
							issuer: tokenContext.issuer,
						});
					},
				},
				{
					providerId: claims.sub,
					providerType: 'oidc',
					// Cheap indexed check, so it gates the lookup rather than
					// filtering its result — a non-SSO issuer never touches an
					// `oidc` row at all.
					applies: async () => await this.trustedKeyService.isSsoIssuer(claims.iss),
				},
			],
		};
	}

	private buildPolicy(
		allowedRoles: string[] | undefined,
		tokenContext: TokenContext,
	): IdentityPolicy {
		// Resolved by the pre-write gate and reused by `onResolved`, so a
		// disallowed role claim throws before a binding is written rather than
		// after. A fresh policy is built per resolution, so this cannot leak
		// between callers.
		let pendingRole: string | undefined;

		return {
			assertEmailVerified: (claims) =>
				this.assertEmailVerified(claims.email_verified, tokenContext),

			assertMayActAs: (user) => this.assertKeyMayActAsUser(user, allowedRoles),

			assertClaimAcceptable: async (user, claims) => {
				pendingRole = await this.resolveRoleForExistingUser(
					claims.role,
					allowedRoles,
					user.role?.slug,
				);
			},

			roleForNewUser: async (claims) => {
				const jitRole = await this.resolveRoleForNewUser(claims.role, allowedRoles);
				return jitRole ? { slug: jitRole } : GLOBAL_MEMBER_ROLE;
			},

			profileSync: 'every-resolution',

			onLinked: (user, claims) => {
				this.logger.debug('Linked external identity to existing user by email', {
					sub: claims.sub,
				});
				this.eventService.emit('token-exchange-identity-linked', {
					userId: user.id,
					sub: claims.sub,
					email: user.email,
					kid: tokenContext.kid ?? '',
					issuer: tokenContext.issuer,
				});
			},

			onProvisioned: (user, claims, roleSlug) => {
				this.eventService.emit('token-exchange-user-provisioned', {
					userId: user.id,
					sub: claims.sub,
					email: user.email,
					role: roleSlug,
					kid: tokenContext.kid ?? '',
					issuer: tokenContext.issuer,
				});
			},

			onResolved: async (user, _claims, path) => {
				// A user provisioned moments ago already has the claimed role.
				if (path === 'provisioned') return user;
				return await this.applyRole(user, pendingRole, tokenContext);
			},
		};
	}

	private assertKeyMayActAsUser(user: User, allowedRoles?: string[]) {
		if (this.config.excludeOwner && user.role?.slug === GLOBAL_OWNER_ROLE_SLUG) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				'User role is not allowed for this key',
			);
		}
		if (allowedRoles?.length && !allowedRoles.includes(user.role?.slug ?? '')) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				'User role is not allowed for this key',
			);
		}
	}

	/**
	 * A key may waive the requirement that the IdP vouch for the email, but not
	 * override the IdP actively saying it is unverified.
	 */
	private assertEmailVerified(emailVerified: unknown, tokenContext: TokenContext) {
		const verification = interpretEmailVerified(emailVerified);

		if (
			verification === 'explicitly-unverified' ||
			(tokenContext.requireVerifiedEmail && verification !== 'verified')
		) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.EmailNotVerified,
				'Email is not verified',
			);
		}
	}

	/**
	 * Apply a role resolved by the pre-write gate. Goes through
	 * `UserService.changeUserRole` so the side effects (API key revocation,
	 * project relation cleanup, cache invalidation) are applied.
	 */
	private async applyRole(
		user: User,
		resolvedRole: string | undefined,
		tokenContext: TokenContext,
	): Promise<User> {
		const previousRole = user.role?.slug;
		if (!resolvedRole || resolvedRole === previousRole) return user;

		await this.userService.changeUserRole(user, { newRoleName: resolvedRole });

		if (previousRole) {
			this.eventService.emit('token-exchange-role-updated', {
				userId: user.id,
				previousRole,
				newRole: resolvedRole,
				kid: tokenContext.kid ?? '',
				issuer: tokenContext.issuer,
			});
		}

		return await this.userRepository.findOneOrFail({
			where: { id: user.id },
			relations: ['role'],
		});
	}

	/**
	 * Resolve the role claim for an existing user.
	 *
	 * Returns the role slug to sync to, or `undefined` to keep the current
	 * role unchanged. Throws when the claimed role is valid but not permitted
	 * by the key's allowedRoles — OAuth flows must be strict to surface
	 * misconfiguration early.
	 */
	private async resolveRoleForExistingUser(
		roleClaim: ExternalTokenClaims['role'],
		allowedRoles: string[] | undefined,
		currentRole: string | undefined,
	): Promise<string | undefined> {
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

		if (!(await this.roleService.isGlobalRole(role))) {
			this.logger.warn('Unknown role claim ignored', { role });
			return undefined;
		}

		// Gate custom roles on the custom-roles license. Unlike unknown roles, an
		// unlicensed custom role is a valid-but-unentitled claim: throwing (rather
		// than ignoring) surfaces the misconfiguration instead of silently keeping
		// the stale role.
		if (!isBuiltInRole(role) && !this.roleService.isRoleLicensed(role)) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				`Role '${role}' is not available in the current license`,
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
	 * Resolve the role claim for a new (JIT-provisioned) user.
	 *
	 * Returns the role slug to provision with, or `undefined` to default to
	 * `global:member`. Unlike existing users, invalid or disallowed roles
	 * throw because we have no fallback role to preserve.
	 */
	private async resolveRoleForNewUser(
		roleClaim: ExternalTokenClaims['role'],
		allowedRoles: string[] | undefined,
	): Promise<string | undefined> {
		if (roleClaim === undefined) return undefined;

		const role = roleClaim;

		if (role === 'global:owner') {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				'Cannot provision global:owner role via token exchange',
			);
		}

		if (!(await this.roleService.isGlobalRole(role))) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				`Unrecognized role '${role}' cannot be assigned to new user`,
			);
		}

		// JIT provisioning bypasses changeUserRole, so gate custom roles on the
		// custom-roles license here to prevent an entitlement bypass.
		if (!isBuiltInRole(role) && !this.roleService.isRoleLicensed(role)) {
			throw new TokenExchangeAuthError(
				TokenExchangeFailureReason.RoleNotAllowed,
				`Role '${role}' is not available in the current license`,
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
}
