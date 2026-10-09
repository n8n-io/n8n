import { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

@BackendModule({ name: 'apps', instanceTypes: ['main'] })
export class AppsModule implements ModuleInterface {
	async init() {
		if (!Container.get(ModuleRegistry).isActive('oauth-server')) {
			throw new UserError('Enable the oauth-server module to use apps.');
		}
		const { UserRepository } = await import('@n8n/db');
		const { ProtectedResourceRegistry } = await import('@/services/protected-resource.registry.js');
		const { AppHostConfig } = await import('./app-host.config.js');
		const config = Container.get(AppHostConfig);
		const userRepository = Container.get(UserRepository);
		Container.get(ProtectedResourceRegistry).register({
			id: 'apps',
			isFirstParty: true,
			skipConsent: true,
			displayName: 'n8n Apps',
			getResourceUrl: () => config.callbackUrl,
			getAudiences: () => [config.callbackUrl],
			getAllowedRedirectUris: async () => [config.callbackUrl],
			scopes: [],
			authorize: async (user) => {
				const currentUser = await userRepository.findOneBy({ id: user.id });
				return !!currentUser && !currentUser.disabled;
			},
		});
		await import('./app-auth.controller.js');
		await import('./apps.controller.js');
		await import('./apps-list.controller.js');
		// Before the serving controller: routes register in import order, and its
		// catch-all would otherwise answer `/apps/<ns>/api/*` with the SPA's index.html.
		await import('./runtime/app-runtime.controller.js');
		await import('./runtime/app-table-runtime.controller.js');
		await import('./runtime/app-agent-runtime.controller.js');
		await import('./serving/app-serving.controller.js');
		await import('./serving/app-inspector-script.controller.js');

		// s3/az reuse the clients base-command already initialized; see agents.module.ts.
		const { AppVersionBlobStore } = await import('./app-version-blob-store.js');
		const { ExecutionDataJsonStore } = await import(
			'@/executions/execution-data/execution-data-json-store.js'
		);
		const { registerAppVersionByteStores } = await import('./register-blob-byte-stores.js');
		await registerAppVersionByteStores(
			Container.get(ExecutionDataJsonStore),
			Container.get(AppVersionBlobStore),
		);
	}

	async settings() {
		const { AppHostConfig } = await import('./app-host.config.js');
		return { baseUrl: Container.get(AppHostConfig).baseUrl };
	}

	async entities() {
		const { App } = await import('./app.entity.js');
		const { AppVersion } = await import('./app-version.entity.js');

		return [App, AppVersion];
	}
}
