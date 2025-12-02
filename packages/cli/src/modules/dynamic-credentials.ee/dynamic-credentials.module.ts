import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'dynamic-credentials', licenseFlag: 'feat:externalSecrets' })
export class DynamicCredentialsModule implements ModuleInterface {
	async init() {
		await import('./context-establishment-hooks');
		await import('./credential-resolvers');
		const { CredentialResolverRegistry } = await import('./services');

		await Container.get(CredentialResolverRegistry).init();
	}

	@OnShutdown()
	async shutdown() {}
}
