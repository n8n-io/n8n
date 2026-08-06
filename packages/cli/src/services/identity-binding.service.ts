import { Logger } from '@n8n/backend-common';
import { AuthIdentity, AuthIdentityRepository, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	IdentityResolutionError,
	type IdentityPolicy,
	type IdentitySource,
	type ResolutionPath,
} from './identity-binding.types';
import type { VerifiedIdentityClaim } from './identity-resolution-proxy.service';

/**
 * Password placeholder for JIT-provisioned users. Not a valid bcrypt hash, so
 * it can never match any input — the user can only authenticate through the
 * identity provider that created them.
 */
export const EXTERNAL_IDENTITY_PASSWORD_PLACEHOLDER = '!external-identity-no-password';

/** `User.firstName` / `User.lastName` are `length: 32`. */
const MAX_NAME_LENGTH = 32;

export function trimName(value: string | undefined, fallback = ''): string {
	return (value ?? fallback).slice(0, MAX_NAME_LENGTH);
}

export type EmailVerification = 'verified' | 'explicitly-unverified' | 'unknown';

/**
 * Read an `email_verified` claim as three states rather than two. "Absent" and
 * "the IdP says no" are different facts and each source is entitled to treat
 * them differently — but they should at least be *read* the same way. Some
 * providers emit the value as a string, hence the `'true'`/`'false'` cases.
 */
export function interpretEmailVerified(value: unknown): EmailVerification {
	if (value === true || value === 'true') return 'verified';
	if (value === false || value === 'false') return 'explicitly-unverified';
	return 'unknown';
}

/**
 * The one implementation of "map a verified external claim to an n8n user".
 *
 * Owns the three-path algorithm and the DB work, and nothing else. Every
 * decision that differs between identity providers — how the `AuthIdentity`
 * row is keyed, what counts as a verified email, which role a new user gets,
 * whether names re-sync on every login — is injected via `IdentitySource` and
 * `IdentityPolicy`, so neither `sso-oidc` nor `token-exchange` needs to know
 * the other exists.
 *
 * The three paths:
 * 1. **Known subject** — an active `AuthIdentity` for this claim → that user.
 * 2. **Email fallback** — an existing account with the claim's email → link it.
 * 3. **JIT provision** — create user, personal project and binding atomically.
 */
@Service()
export class IdentityBindingService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
	) {
		this.logger = logger.scoped('identity-binding');
	}

	/**
	 * `allowProvisioning` is required at the call site rather than defaulted,
	 * so a trigger-originated, unauthenticated access path can never create a
	 * user. When `false` this is a read-only indexed lookup that returns `null`
	 * instead of throwing — an unbound identity must not stop an execution.
	 */
	async resolve(
		source: IdentitySource,
		claims: VerifiedIdentityClaim,
		policy: IdentityPolicy,
		opts: { allowProvisioning: true },
	): Promise<User>;
	async resolve(
		source: IdentitySource,
		claims: VerifiedIdentityClaim,
		policy: IdentityPolicy,
		opts: { allowProvisioning: boolean },
	): Promise<User | null>;
	async resolve(
		source: IdentitySource,
		claims: VerifiedIdentityClaim,
		policy: IdentityPolicy,
		{ allowProvisioning }: { allowProvisioning: boolean },
	): Promise<User | null> {
		const identity = await this.findBoundIdentity(source, claims, allowProvisioning);

		if (identity) {
			// Fail closed on a suspended or revoked binding, on every path. On the
			// read-only path that means "no principal"; on a login it is an error.
			if (identity.status !== 'active') {
				this.logger.warn('Refusing a non-active identity binding', {
					providerType: source.providerType,
					status: identity.status,
				});
				if (!allowProvisioning) return null;
				throw new IdentityResolutionError(
					'binding-not-active',
					'This identity binding is no longer active',
				);
			}

			// Key-scoped restrictions deliberately do not apply to the read-only
			// path: it re-derives a principal for an execution that is already
			// running, and must not throw.
			if (!allowProvisioning) return identity.user;

			policy.assertMayActAs?.(identity.user);
			await policy.assertClaimAcceptable?.(identity.user, claims);

			return await this.finish(identity.user, claims, policy, 'known-subject');
		}

		if (!allowProvisioning) return null;

		// Emails are stored lowercased (`User.email` carries a lower-casing
		// transformer and a `@BeforeInsert` hook), so match that here rather
		// than relying on the driver to normalise the comparison.
		const email = claims.email?.toLowerCase();
		if (!email) {
			throw new IdentityResolutionError(
				'missing-email',
				'Email claim is required to link or provision a user',
			);
		}

		const existingUser = await this.userRepository.findOne({
			where: { email },
			relations: ['authIdentities', 'role'],
		});

		if (existingUser) {
			return await this.linkToExistingUser(source, claims, policy, existingUser);
		}

		return await this.provisionUser(source, claims, policy, email);
	}

	/**
	 * Primary key first, then each declared fallback in order — so a legacy or
	 * bridged row never shadows a binding written in the current key format.
	 */
	private async findBoundIdentity(
		source: IdentitySource,
		claims: VerifiedIdentityClaim,
		allowWrites: boolean,
	): Promise<AuthIdentity | null> {
		const primary = await this.authIdentityRepository.findOne({
			where: { providerId: source.keyFor(claims), providerType: source.providerType },
			relations: { user: { role: true } },
		});
		if (primary) return primary;

		for (const fallback of source.fallbacks ?? []) {
			if (fallback.applies && !(await fallback.applies())) continue;

			const identity = await this.authIdentityRepository.findOne({
				where: { providerId: fallback.providerId, providerType: fallback.providerType },
				relations: { user: { role: true } },
			});
			if (!identity) continue;
			if (fallback.accepts && !(await fallback.accepts(identity))) continue;

			// Rebinding is a write; keep the per-access read-only path free of it.
			if (allowWrites && fallback.rebind) {
				await fallback.rebind(identity);
			}
			return identity;
		}

		return null;
	}

	/** Path 2: an account already exists for this email — bind this subject to it. */
	private async linkToExistingUser(
		source: IdentitySource,
		claims: VerifiedIdentityClaim,
		policy: IdentityPolicy,
		existingUser: User,
	): Promise<User> {
		policy.assertMayActAs?.(existingUser);
		// Linking keys off the email, so it has to be one the IdP vouches for.
		policy.assertEmailVerified(claims);
		await policy.assertClaimAcceptable?.(existingUser, claims);

		this.logger.debug('Linking external identity to an existing user by email', {
			providerType: source.providerType,
		});

		await this.authIdentityRepository.save(
			AuthIdentity.create(existingUser, source.keyFor(claims), source.providerType),
		);
		policy.onLinked?.(existingUser, claims);

		return await this.finish(existingUser, claims, policy, 'linked-by-email');
	}

	/** Path 3: no account and no binding — create both. */
	private async provisionUser(
		source: IdentitySource,
		claims: VerifiedIdentityClaim,
		policy: IdentityPolicy,
		email: string,
	): Promise<User> {
		policy.assertEmailVerified(claims);

		const role = await policy.roleForNewUser(claims);

		this.logger.debug('Provisioning a new user from an external identity', {
			providerType: source.providerType,
			role: role.slug,
		});

		const user = await this.userRepository.createUserWithExternalIdentity(
			{
				email,
				firstName: trimName(claims.given_name),
				lastName: trimName(claims.family_name),
				role,
				password: EXTERNAL_IDENTITY_PASSWORD_PLACEHOLDER,
			},
			{ providerId: source.keyFor(claims), providerType: source.providerType },
		);

		policy.onProvisioned?.(user, claims, role.slug);

		// Names were just written from the claim, so there is nothing to re-sync.
		return (await policy.onResolved?.(user, claims, 'provisioned')) ?? user;
	}

	/** Profile sync then the adapter's final hook — shared by paths 1 and 2. */
	private async finish(
		user: User,
		claims: VerifiedIdentityClaim,
		policy: IdentityPolicy,
		path: ResolutionPath,
	): Promise<User> {
		const synced =
			policy.profileSync === 'every-resolution' ? await this.syncProfile(user, claims) : user;

		return (await policy.onResolved?.(synced, claims, path)) ?? synced;
	}

	/**
	 * Write back `firstName`/`lastName` when the claim disagrees with what we
	 * have. Returns a reloaded user so the caller never sees a stale copy.
	 */
	private async syncProfile(user: User, claims: VerifiedIdentityClaim): Promise<User> {
		const updates: Pick<Partial<User>, 'firstName' | 'lastName'> = {};

		if (claims.given_name !== undefined) {
			const trimmed = trimName(claims.given_name);
			if (trimmed !== user.firstName) updates.firstName = trimmed;
		}

		if (claims.family_name !== undefined) {
			const trimmed = trimName(claims.family_name);
			if (trimmed !== user.lastName) updates.lastName = trimmed;
		}

		if (Object.keys(updates).length === 0) return user;

		await this.userRepository.update(user.id, updates);

		return await this.userRepository.findOneOrFail({
			where: { id: user.id },
			relations: ['role'],
		});
	}
}
