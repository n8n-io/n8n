import { Service } from '@n8n/di';

/**
 * Contract for registering a trusted key source derived from an SSO
 * provider's discovery document. Implemented by the optional
 * `token-exchange` module.
 */
export interface TrustedKeySourceRegistrar {
	registerFromDiscovery(issuer: string, jwksUri: string): Promise<void>;
}

/**
 * Proxy through which an SSO provider (e.g. `sso-oidc`) registers itself as
 * a trusted key source without importing `token-exchange` directly.
 *
 * The `token-exchange` module registers its provider on init — same pattern
 * as `RoleDeletionCheckProxy`. Until a provider is registered (e.g.
 * token-exchange isn't licensed/enabled), registration is a no-op.
 */
@Service()
export class TrustedKeySourceRegistrationProxy implements TrustedKeySourceRegistrar {
	private provider: TrustedKeySourceRegistrar | null = null;

	registerProvider(provider: TrustedKeySourceRegistrar): void {
		this.provider = provider;
	}

	async registerFromDiscovery(issuer: string, jwksUri: string): Promise<void> {
		if (!this.provider) return;
		await this.provider.registerFromDiscovery(issuer, jwksUri);
	}
}
