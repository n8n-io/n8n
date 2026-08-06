import type { AuthIdentity, AuthProviderType, User } from '@n8n/db';

import type { VerifiedIdentityClaim } from './identity-resolution-proxy.service';

/** Which of the three resolution paths produced the user. */
export type ResolutionPath = 'known-subject' | 'linked-by-email' | 'provisioned';

export type IdentityResolutionFailure = 'missing-email' | 'binding-not-active';

/**
 * The only error the shared core raises itself. Everything else is thrown by
 * an injected policy hook, so each adapter keeps its own error type.
 */
export class IdentityResolutionError extends Error {
	constructor(
		readonly failure: IdentityResolutionFailure,
		message: string,
	) {
		super(message);
	}
}

/**
 * A read-only lookup tried after the primary key missed.
 *
 * This is how a source declares the key formats it used to write, without the
 * core knowing anything about issuers or SSO. Once `AuthIdentity` gains a
 * modelled `(sourceId, subject)` key, both of today's fallbacks
 * (token-exchange's legacy unqualified sub, and the OIDC bridge) disappear
 * along with this type.
 */
export interface IdentityFallback {
	providerId: string;
	providerType: AuthProviderType;
	/**
	 * Guard evaluated before the lookup. Use when the check is cheaper than the
	 * lookup it would skip.
	 */
	applies?: () => Promise<boolean>;
	/**
	 * Guard evaluated only once a row has actually matched. Use when the check
	 * is the expensive part, so it is not paid on every resolution that ends up
	 * provisioning.
	 */
	accepts?: (identity: AuthIdentity) => Promise<boolean>;
	/**
	 * Rewrite the row to the primary key. Called only when the caller allows
	 * writes, so the per-access read-only path never mutates a binding.
	 */
	rebind?: (identity: AuthIdentity) => Promise<void>;
}

/**
 * Where an identity comes from. Supplies the `AuthIdentity` key format, which
 * is the one thing that genuinely differs between OIDC and token-exchange.
 */
export interface IdentitySource {
	providerType: AuthProviderType;
	/** Primary `AuthIdentity.providerId` for this claim. */
	keyFor(claims: VerifiedIdentityClaim): string;
	/** Tried in order, after the primary key misses. */
	fallbacks?: IdentityFallback[];
}

/**
 * Everything the core deliberately does not decide. Each hook is owned by the
 * adapter, so the core encodes no email-verification, role or profile policy.
 */
export interface IdentityPolicy {
	/**
	 * Throws when the claim's email is not verified to this source's standard.
	 * Called before linking to an existing account and before provisioning a
	 * new one — never on the known-subject path, where the binding already
	 * proves the association.
	 */
	assertEmailVerified(claims: VerifiedIdentityClaim): void;

	/** Throws when this caller may not act as `user` (e.g. a key's allowedRoles). */
	assertMayActAs?(user: User): void;

	/**
	 * Second pre-write gate for an existing user, run after
	 * `assertEmailVerified` on the email-link path. Exists so a policy can
	 * reject a claim it may not assert (a disallowed role, say) *before* the
	 * core writes a binding — a rejected login must leave no trace. Anything
	 * expensive it resolves can be memoised on the policy instance and reused
	 * in `onResolved`, since adapters build a fresh policy per resolution.
	 */
	assertClaimAcceptable?(user: User, claims: VerifiedIdentityClaim): Promise<void>;

	/** Resolved before the provisioning transaction opens. */
	roleForNewUser(claims: VerifiedIdentityClaim): Promise<{ slug: string }>;

	/**
	 * `'every-resolution'` re-syncs `firstName`/`lastName` from the claim on
	 * every login; `'on-provision'` sets them once, at provisioning.
	 */
	profileSync: 'on-provision' | 'every-resolution';

	onLinked?(user: User, claims: VerifiedIdentityClaim): void;
	onProvisioned?(user: User, claims: VerifiedIdentityClaim, roleSlug: string): void;

	/**
	 * Last hook on every path. Returns the user to hand back, so an adapter
	 * that mutates the user (role provisioning) can return a reloaded copy.
	 */
	onResolved?(user: User, claims: VerifiedIdentityClaim, path: ResolutionPath): Promise<User>;
}
