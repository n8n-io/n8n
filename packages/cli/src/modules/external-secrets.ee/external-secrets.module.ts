import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'external-secrets', licenseFlag: 'feat:externalSecrets' })
export class ExternalSecretsModule implements ModuleInterface {
	async init() {
		await import('./external-secrets.controller.ee');

		await import('./secrets-providers-types.controller.ee');
		await import('./secrets-providers-connections.controller.ee');
		await import('./secrets-providers-autocomplete.controller.ee');
		await import('./secrets-providers-project.controller.ee');

		const { ExternalSecretsManager } = await import('./external-secrets-manager.ee');
		const { ExternalSecretsProxy } = await import('n8n-core');

		const { SecretsCacheRefresh } = await import('./secrets-cache-refresh.service.ee');
		const secretsCacheRefresh = Container.get(SecretsCacheRefresh);

		await secretsCacheRefresh.init();
		const externalSecretsManager = Container.get(ExternalSecretsManager);
		const externalSecretsProxy = Container.get(ExternalSecretsProxy);
		externalSecretsProxy.setManager(externalSecretsManager);
	}

	@OnShutdown()
	async shutdown() {
		const { SecretsCacheRefresh } = await import('./secrets-cache-refresh.service.ee');

		Container.get(SecretsCacheRefresh).shutdown();
	}
}
