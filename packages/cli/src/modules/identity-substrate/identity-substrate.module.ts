import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

function isFeatureFlagEnabled(): boolean {
	// OR semantics: an existing token-exchange licensee with
	// N8N_ENV_FEAT_TOKEN_EXCHANGE=true gets the substrate automatically on
	// upgrade, on every instance type it now runs on, with no separate flag
	// flip required to keep today's behavior on `main`.
	return (
		process.env.N8N_ENV_FEAT_IDENTITY_SUBSTRATE === 'true' ||
		process.env.N8N_ENV_FEAT_TOKEN_EXCHANGE === 'true'
	);
}

@BackendModule({
	name: 'identity-substrate',
	// OR semantics (see `ModuleRegistry.initModules`): licensed for either
	// feature is enough. This is what lets an existing token-exchange
	// licensee pick up substrate behavior (inbound verification on workers/
	// webhooks) without a license-server change.
	licenseFlag: [LICENSE_FEATURES.IDENTITY_SUBSTRATE, LICENSE_FEATURES.TOKEN_EXCHANGE],
	instanceTypes: ['main', 'worker', 'webhook'],
})
export class IdentitySubstrateModule implements ModuleInterface {
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

		// Register as the ExternalTokenVerifierProxy provider so other modules
		// (including workers/webhooks establishing execution context) can
		// verify without importing this module. Registered unconditionally
		// within this instanceTypes-gated init() so it registers even when the
		// RFC 8693 consumer module (`token-exchange`) is disabled/unlicensed.
		const { ExternalTokenVerifierProxy } = await import(
			'@/services/external-token-verifier-proxy.service.js'
		);
		const { ExternalTokenVerifierService } = await import(
			'./services/external-token-verifier.service.js'
		);
		Container.get(ExternalTokenVerifierProxy).registerProvider(
			Container.get(ExternalTokenVerifierService),
		);

		const { IdentityResolutionProxy } = await import(
			'@/services/identity-resolution-proxy.service.js'
		);
		const { IdentityResolutionService } = await import('./services/identity-resolution.service.js');
		Container.get(IdentityResolutionProxy).registerProvider(
			Container.get(IdentityResolutionService),
		);

		// Import-for-side-effect: the @ContextEstablishmentHook decorator
		// registers this class into ContextEstablishmentHookMetadata at
		// class-evaluation time; ExecutionContextHookRegistry.init() discovers
		// it later. Safe and required on every instance type — this is what
		// makes inbound verification run for worker-side execution context
		// establishment (queue mode, manual-offload executions), not just main.
		await import('./context-establishment-hooks/inbound-claim-verification-hook.js');

		const instanceSettings = Container.get(InstanceSettings);
		if (instanceSettings.instanceType === 'main') {
			// The write/refresh lifecycle (DB sync, JWKS polling, leader
			// takeover/stepdown) only ever needs to run once per cluster, and
			// is wired to `MultiMainSetup`, which is only ever instantiated on
			// `main` (see `commands/start.ts`).
			const { TrustedKeySyncService } = await import('./services/trusted-key-sync.service.js');
			const trustedKeySyncService = Container.get(TrustedKeySyncService);
			await trustedKeySyncService.initialize();

			// Let `sso-oidc` register itself as a trusted key source (from its
			// OIDC discovery document) without this module importing it. Must
			// run before `sso-oidc`'s own init() (see `defaultModules` order in
			// `@n8n/backend-common`'s `ModuleRegistry`), since sso-oidc self-heals
			// its trusted key source registration on init and needs a provider
			// already registered here. Only wired on `main` since it delegates
			// to the write path above.
			const { TrustedKeySourceRegistrationProxy } = await import(
				'@/services/trusted-key-source-registration-proxy.service.js'
			);
			Container.get(TrustedKeySourceRegistrationProxy).registerProvider({
				registerFromDiscovery: async (issuer, jwksUri) =>
					await trustedKeySyncService.registerSsoDerivedSource(issuer, jwksUri),
			});

			const { JtiCleanupService } = await import('./services/jti-cleanup.service.js');
			Container.get(JtiCleanupService).init();
		}
	}
}
