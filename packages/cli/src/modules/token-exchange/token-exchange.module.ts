import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE === 'true';
}

@BackendModule({
	name: 'token-exchange',
	licenseFlag: LICENSE_FEATURES.TOKEN_EXCHANGE,
	instanceTypes: ['main'],
})
export class TokenExchangeModule implements ModuleInterface {
	async entities() {
		const { TokenExchangeJti } = await import('./database/entities/token-exchange-jti.entity.js');
		const { TrustedKeySourceEntity } = await import(
			'./database/entities/trusted-key-source.entity.js'
		);
		const { TrustedKeyEntity } = await import('./database/entities/trusted-key.entity.js');
		return [TokenExchangeJti, TrustedKeySourceEntity, TrustedKeyEntity] as never;
	}

	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		const { TrustedKeyService } = await import('./services/trusted-key.service.js');
		const trustedKeyService = Container.get(TrustedKeyService);
		await trustedKeyService.initialize();

		// Let `sso-oidc` register itself as a trusted key source (from its OIDC
		// discovery document) without this module importing it. Must run before
		// `sso-oidc`'s own init() (see `defaultModules` order in
		// `@n8n/backend-common`'s `ModuleRegistry`), since sso-oidc self-heals
		// its trusted key source registration on init and needs a provider
		// already registered here.
		const { TrustedKeySourceRegistrationProxy } = await import(
			'@/services/trusted-key-source-registration-proxy.service.js'
		);
		Container.get(TrustedKeySourceRegistrationProxy).registerProvider({
			registerFromDiscovery: async (issuer, jwksUri) =>
				await trustedKeyService.registerSsoDerivedSource(issuer, jwksUri),
		});

		// Register as the ExternalTokenVerifierProxy provider so other modules can verify without importing this one.
		const { ExternalTokenVerifierProxy } = await import(
			'@/services/external-token-verifier-proxy.service.js'
		);
		const { TokenExchangeService } = await import('./services/token-exchange.service.js');
		Container.get(ExternalTokenVerifierProxy).registerProvider(Container.get(TokenExchangeService));

		await import('./controllers/token-exchange.controller.js');
		await import('./controllers/embed-auth.controller.js');

		const { JtiCleanupService } = await import('./services/jti-cleanup.service.js');
		Container.get(JtiCleanupService).init();

		// Register the scoped JWT auth strategy into the public API auth chain.
		// ScopedJwtStrategy runs after ApiKeyAuthStrategy (which abstains for token-exchange JWTs).
		const { ScopedJwtStrategy } = await import('./services/scoped-jwt.strategy.js');
		const { AuthStrategyRegistry } = await import('@/services/auth-strategy.registry.js');
		Container.get(AuthStrategyRegistry).register(Container.get(ScopedJwtStrategy));
	}
}
