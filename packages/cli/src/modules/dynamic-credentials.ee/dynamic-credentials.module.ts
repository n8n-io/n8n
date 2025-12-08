import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'dynamic-credentials', licenseFlag: 'feat:externalSecrets' })
export class DynamicCredentialsModule implements ModuleInterface {
	async init() {
		await import('./context-establishment-hooks');
		await import('./credential-resolvers');
		const { DynamicCredentialResolverRegistry } = await import('./services');

		await Container.get(DynamicCredentialResolverRegistry).init();
	}

	async entities() {
		const { DynamicCredentialResolver } = await import('./database/entities/credential-resolver');
		const { DynamicCredentialEntry } = await import('./database/entities/dynamic-credential-entry');

		return [DynamicCredentialResolver, DynamicCredentialEntry];
	}

	@OnShutdown()
	async shutdown() {}
}
