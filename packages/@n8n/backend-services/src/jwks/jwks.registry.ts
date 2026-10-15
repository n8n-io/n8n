import { Service } from '@n8n/di';
import type { JWK } from 'jose';
import { UnexpectedError } from 'n8n-workflow';

/**
 * A source of public keys for the instance JWKS. Keys from different
 * providers are told apart by `kid` and `use`.
 */
export interface JwksProvider {
	/** Stable identifier, e.g. `'oauth-jwe'`. */
	readonly id: string;

	/** Public keys to publish. The JWKS controller drops any key that fails `PublicJwkSchema`. */
	getPublicJwks(): Promise<JWK[]>;
}

/**
 * Registry of the keys served at `/rest/.well-known/jwks.json`. Modules register
 * a provider on init, so the endpoint exists on every instance and does not
 * depend on which modules are enabled.
 */
@Service()
export class JwksRegistry {
	private readonly providers = new Map<string, JwksProvider>();

	/** Throws on a duplicate `id`, so a provider's keys cannot drop out silently. */
	register(provider: JwksProvider): void {
		if (this.providers.has(provider.id)) {
			throw new UnexpectedError(`JWKS provider "${provider.id}" is already registered`);
		}
		this.providers.set(provider.id, provider);
	}

	/**
	 * Union of every provider's keys. A provider error propagates, so the
	 * endpoint answers 500 and IdPs keep the key set they fetched before,
	 * rather than caching a set with keys missing.
	 */
	async getPublicJwks(): Promise<JWK[]> {
		const keySets = await Promise.all(
			[...this.providers.values()].map(async (provider) => await provider.getPublicJwks()),
		);
		return keySets.flat();
	}
}
