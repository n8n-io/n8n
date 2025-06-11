import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@N8nModule()
export class ExternalSecretsModule implements BaseN8nModule {
	async init() {
		await import('./external-secrets.controller.ee');

		const { ExternalSecretsManager } = await import('./external-secrets-manager.ee');
		const { ExternalSecretsProxy } = await import('n8n-core');

		const externalSecretsManager = Container.get(ExternalSecretsManager);
		const externalSecretsProxy = Container.get(ExternalSecretsProxy);

		await externalSecretsManager.init();
		externalSecretsProxy.setManager(externalSecretsManager);
	}
}
