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
	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		const { TrustedKeySyncService } = await import(
			'@/modules/identity-substrate/services/trusted-key-sync.service.js'
		);
		const trustedKeySyncService = Container.get(TrustedKeySyncService);
		await trustedKeySyncService.initialize();

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
				await trustedKeySyncService.registerSsoDerivedSource(issuer, jwksUri),
		});

		// Register as the ExternalTokenVerifierProxy provider so other modules can verify without importing this one.
		const { ExternalTokenVerifierProxy } = await import(
			'@/services/external-token-verifier-proxy.service.js'
		);
		const { ExternalTokenVerifierService } = await import(
			'@/modules/identity-substrate/services/external-token-verifier.service.js'
		);
		Container.get(ExternalTokenVerifierProxy).registerProvider(
			Container.get(ExternalTokenVerifierService),
		);

		const { IdentityResolutionProxy } = await import(
			'@/services/identity-resolution-proxy.service.js'
		);
		const { IdentityResolutionService } = await import(
			'@/modules/identity-substrate/services/identity-resolution.service.js'
		);
		Container.get(IdentityResolutionProxy).registerProvider(
			Container.get(IdentityResolutionService),
		);

		// Import-for-side-effect: the @ContextEstablishmentHook decorator
		// registers this class into ContextEstablishmentHookMetadata at
		// class-evaluation time; ExecutionContextHookRegistry.init() discovers
		// it later.
		await import(
			'@/modules/identity-substrate/context-establishment-hooks/inbound-claim-verification-hook.js'
		);

		await import('./controllers/token-exchange.controller.js');
		await import('./controllers/embed-auth.controller.js');
		await import('./controllers/trusted-key-source.controller.js');

		const { JtiCleanupService } = await import(
			'@/modules/identity-substrate/services/jti-cleanup.service.js'
		);
		Container.get(JtiCleanupService).init();

		// Register the scoped JWT auth strategy into the public API auth chain.
		// ScopedJwtStrategy runs after ApiKeyAuthStrategy (which abstains for token-exchange JWTs).
		const { ScopedJwtStrategy } = await import('./services/scoped-jwt.strategy.js');
		const { AuthStrategyRegistry } = await import('@/services/auth-strategy.registry.js');
		Container.get(AuthStrategyRegistry).register(Container.get(ScopedJwtStrategy));
	}
}
