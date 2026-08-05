import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Structurally compatible with token-exchange's `ExternalTokenClaims`, and
 * intended to also fit the sealed `VerifiedClaim` once it lands (IAM-1166 /
 * IAM-1168) — a JWT-claim shape, not a bespoke one.
 */
export interface VerifiedIdentityClaim {
	iss: string;
	sub: string;
	email?: string;
	email_verified?: boolean;
	given_name?: string;
	family_name?: string;
	role?: string;
}

export interface IdentityBindingContext {
	issuer: string;
	kid?: string;
	requireVerifiedEmail?: boolean;
}

export interface IdentityResolver {
	/**
	 * Resolve a verified claim to the n8n user it is bound to.
	 *
	 * `allowProvisioning` is required at the call site (not optional/defaulted)
	 * so a trigger-originated, unauthenticated access path can never create a
	 * user. When `false`, this must be a cheap, read-only, indexed lookup —
	 * no network call, no crypto — and must return `null` (never throw in a
	 * way that stops the caller) when there is no active binding.
	 */
	resolve(
		claims: VerifiedIdentityClaim,
		allowedRoles: string[] | undefined,
		tokenContext: IdentityBindingContext,
		allowProvisioning: boolean,
	): Promise<User | null>;
}

/**
 * Proxy through which callers resolve a verified external identity to an
 * n8n user without importing the `token-exchange` module directly.
 *
 * `token-exchange` registers its `IdentityResolutionService` as the provider
 * on init — same pattern as `OAuthTokenVerifierProxy` / `RuntimeCredentialProxyService`.
 * Until a provider is registered (e.g. the module is disabled on this
 * instance), resolution degrades to "no principal" rather than throwing.
 */
@Service()
export class IdentityResolutionProxy implements IdentityResolver {
	private provider: IdentityResolver | null = null;

	registerProvider(provider: IdentityResolver): void {
		this.provider = provider;
	}

	async resolve(
		claims: VerifiedIdentityClaim,
		allowedRoles: string[] | undefined,
		tokenContext: IdentityBindingContext,
		allowProvisioning: boolean,
	): Promise<User | null> {
		if (!this.provider) return null;
		return await this.provider.resolve(claims, allowedRoles, tokenContext, allowProvisioning);
	}
}
