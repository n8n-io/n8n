import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'external-secrets', licenseFlag: 'feat:externalSecrets' })
export class ExternalSecretsModule implements ModuleInterface {
	async init() {
		await import('./external-secrets.controller.ee');
		await import('./external-secrets-settings.controller.ee');

		await import('./secrets-providers-types.controller.ee');
		await import('./secrets-providers-connections.controller.ee');
		await import('./secrets-providers-completions.controller.ee');
		await import('./secrets-providers-project.controller.ee');

		const { ExternalSecretsManager } = await import('./external-secrets-manager.ee');
		const { ExternalSecretsProxy } = await import('n8n-core');

		const externalSecretsManager = Container.get(ExternalSecretsManager);
		const externalSecretsProxy = Container.get(ExternalSecretsProxy);

		await externalSecretsManager.init();
		externalSecretsProxy.setManager(externalSecretsManager);
	}

	async settings() {
		const { ExternalSecretsConfig } = await import('./external-secrets.config');
		const config = Container.get(ExternalSecretsConfig);

		const { ExternalSecretsSettingsService } = await import(
			'./external-secrets-settings.service.ee'
		);
		const settingsService = Container.get(ExternalSecretsSettingsService);

		return {
			multipleConnections: config.externalSecretsMultipleConnections,
			forProjects: config.externalSecretsForProjects,
			roleBasedAccess: config.externalSecretsRoleBasedAccess,
			systemRolesEnabled: config.externalSecretsRoleBasedAccess
				? await settingsService.isSystemRolesEnabled()
				: false,
		};
	}

	@OnShutdown()
	async shutdown() {
		const { ExternalSecretsManager } = await import('./external-secrets-manager.ee');

		Container.get(ExternalSecretsManager).shutdown();
	}
}
