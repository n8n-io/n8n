import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_CONTEXT_ESTABLISHMENT_HOOKS === 'true';
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
		const { DynamicCredentialResolverRegistry } = await import('./services');

		await Container.get(DynamicCredentialResolverRegistry).init();
	}

	async entities() {
		if (!isFeatureFlagEnabled()) {
			return [];
		}
		const { DynamicCredentialResolver } = await import('./database/entities/credential-resolver');
		const { DynamicCredentialEntry } = await import('./database/entities/dynamic-credential-entry');

		return [DynamicCredentialResolver, DynamicCredentialEntry];
	}

	@OnShutdown()
	async shutdown() {}
}
