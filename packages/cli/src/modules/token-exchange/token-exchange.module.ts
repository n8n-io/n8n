import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE === 'true';
}

/**
 * RFC 8693 token exchange endpoints, the embed-auth controller, and the
 * scoped JWT public-API auth strategy. Consumes the identity-substrate
 * module's verifier/resolver rather than owning them - see
 * `@/modules/identity-substrate` for the trust-source registry, verifier,
 * and identity resolution that this module (and others, e.g. inbound-IdP-
 * protected webhooks) build on.
 */
@BackendModule({
	name: 'token-exchange',
	licenseFlag: LICENSE_FEATURES.TOKEN_EXCHANGE,
	instanceTypes: ['main'],
})
export class TokenExchangeModule implements ModuleInterface {
	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		await import('./controllers/token-exchange.controller.js');
		await import('./controllers/embed-auth.controller.js');
		await import('./controllers/trusted-key-source.controller.js');

		// Register the scoped JWT auth strategy into the public API auth chain.
		// ScopedJwtStrategy runs after ApiKeyAuthStrategy (which abstains for token-exchange JWTs).
		const { ScopedJwtStrategy } = await import('./services/scoped-jwt.strategy.js');
		const { AuthStrategyRegistry } = await import('@/services/auth-strategy.registry.js');
		Container.get(AuthStrategyRegistry).register(Container.get(ScopedJwtStrategy));
	}
}
