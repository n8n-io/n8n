import { isEnvFeatureEnabled, Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationPipeline,
	AuthenticationService,
	IdentityService,
	LocalAuthorizationServer,
	ResourceAdmission,
	TrustedSourceGate,
	TrustedSourceStore,
} from '@n8n/inbound-auth';
import { InstanceSettings } from 'n8n-core';

import { AuthStrategyRegistry, ProtectedResourceRegistry } from '@n8n/backend-services/auth';

/**
 * Owns the `trusted_source` and `trusted_source_identity` tables and binds the inbound-auth
 * contracts. Main, webhook and worker instances load it, because workers and webhook processes
 * resolve the same entities and contracts as main. Only main instances seed the system trusted
 * source.
 */
@BackendModule({ name: 'inbound-auth-core', instanceTypes: ['main', 'webhook', 'worker'] })
export class InboundAuthCoreModule implements ModuleInterface {
	async init() {
		// A binding that already exists wins: the defaults only fill the gap.
		const { LocalAuthorizationServerProxy } = await import('./local-authorization-server.proxy.js');
		const localServer = Container.get(LocalAuthorizationServerProxy);
		if (!Container.has(LocalAuthorizationServer)) {
			Container.set(LocalAuthorizationServer, localServer);
		}

		const { TrustedSourceDbStore } = await import('./trusted-source.store.js');
		if (!Container.has(TrustedSourceStore)) {
			Container.set(TrustedSourceStore, Container.get(TrustedSourceDbStore));
		}

		const { TrustedSourceDbGate } = await import('./trusted-source.gate.js');
		if (!Container.has(TrustedSourceGate)) {
			Container.set(TrustedSourceGate, Container.get(TrustedSourceDbGate));
		}

		if (Container.get(InstanceSettings).instanceType === 'main') {
			const { SystemTrustedSourceSeeder } = await import('./system-trusted-source.seeder.js');
			await Container.get(SystemTrustedSourceSeeder).seed();

			// The seeded source stays `unchecked` until discovery reads the local server, and the
			// gate refuses such a source. Discover it as soon as the server is bound, or a fresh
			// main rejects its own tokens until the first run of the discovery task.
			// Failure-tolerant: the task retries, and boot must go on.
			const { SYSTEM_TRUSTED_SOURCE_ID } = await import('./constants.js');
			await localServer.onProviderRegistered(async () => {
				try {
					const { TrustedSourceDiscoveryService } = await import(
						'./trusted-source-discovery.service.js'
					);
					await Container.get(TrustedSourceDiscoveryService).refresh(SYSTEM_TRUSTED_SOURCE_ID);
				} catch (error) {
					Container.get(Logger).warn('Could not discover the system trusted source at boot', {
						error,
					});
				}
			});

			// Ships dark. Set `N8N_ENV_FEAT_TRUSTED_SOURCES_API_ENABLED=true` on a main instance to register
			// the `/trusted-sources` management routes; the license gates only create and update.
			if (isEnvFeatureEnabled('N8N_ENV_FEAT_TRUSTED_SOURCES_API_ENABLED')) {
				await import('./trusted-source.controller.js');
			}
		}

		const { OAuth2AuthenticationService } = await import('./authentication.service.js');
		Container.set(AuthenticationService, Container.get(OAuth2AuthenticationService));

		const { TrustedSourceIdentityService } = await import(
			'./identity/trusted-source-identity.service.js'
		);
		if (!Container.has(IdentityService)) {
			Container.set(IdentityService, Container.get(TrustedSourceIdentityService));
		}

		const { InboundAuthPipeline } = await import('./authentication-pipeline.js');
		Container.set(AuthenticationPipeline, Container.get(InboundAuthPipeline));

		const { InboundResourceAdmission } = await import('./resource-admission.js');
		Container.set(ResourceAdmission, Container.get(InboundResourceAdmission));

		// Only main serves the public API. The strategy resolves the pipeline, so it registers last.
		if (Container.get(InstanceSettings).instanceType === 'main') {
			const { PublicApiProtectedResource } = await import('./public-api-protected-resource.js');
			const { PublicApiOAuthStrategy } = await import('./public-api-oauth.strategy.js');
			Container.get(ProtectedResourceRegistry).register(Container.get(PublicApiProtectedResource));
			Container.get(AuthStrategyRegistry).register(Container.get(PublicApiOAuthStrategy));
		}
	}

	/** Lets trigger nodes fill their `trustedSource` dropdown through `ILoadOptionsFunctions`. */
	async context() {
		const { TrustedSourceDbDirectory } = await import('./trusted-source-directory.service.js');
		return { trustedSourceDirectory: Container.get(TrustedSourceDbDirectory) };
	}

	// Ungated: the runner skips a cluster-scoped task on webhook and worker instances itself.
	async systemTasks() {
		const { TrustedSourceDiscoveryTask } = await import('./trusted-source-discovery.task.js');
		return [TrustedSourceDiscoveryTask];
	}

	async entities() {
		const { TrustedSourceEntity } = await import('./database/entities/trusted-source.entity.js');
		const { TrustedSourceIdentityEntity } = await import(
			'./database/entities/trusted-source-identity.entity.js'
		);

		return [TrustedSourceEntity, TrustedSourceIdentityEntity];
	}
}
