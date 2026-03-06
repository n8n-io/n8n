import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS === 'true';
}

@BackendModule({ name: 'dynamic-credentials', licenseFlag: LICENSE_FEATURES.DYNAMIC_CREDENTIALS })
export class DynamicCredentialsModule implements ModuleInterface {
	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}
		await import('./dynamic-credentials.controller');
		await import('./credential-resolvers.controller');
		await import('./context-establishment-hooks');
		await import('./credential-resolvers');
		const {
			DynamicCredentialResolverRegistry,
			DynamicCredentialStorageService,
			DynamicCredentialService,
		} = await import('./services');
		await import('./workflow-status.controller');

		await Container.get(DynamicCredentialResolverRegistry).init();

		// Register the credential resolution provider with CredentialsHelper
		const { DynamicCredentialsProxy } = await import('../../credentials/dynamic-credentials-proxy');
		const credentialsProxy = Container.get(DynamicCredentialsProxy);
		const dynamicCredentialService = Container.get(DynamicCredentialService);
		const dynamicCredentialStorageService = Container.get(DynamicCredentialStorageService);
		credentialsProxy.setResolverProvider(dynamicCredentialService);
		credentialsProxy.setStorageProvider(dynamicCredentialStorageService);
	}

	async entities() {
		if (!isFeatureFlagEnabled()) {
			return [];
		}
		const { DynamicCredentialResolver } = await import('./database/entities/credential-resolver');
		const { DynamicCredentialEntry } = await import('./database/entities/dynamic-credential-entry');
		const { DynamicCredentialUserEntry } = await import(
			'./database/entities/dynamic-credential-user-entry'
		);

		return [DynamicCredentialResolver, DynamicCredentialEntry, DynamicCredentialUserEntry];
	}

	@OnShutdown()
	async shutdown() {}
}
