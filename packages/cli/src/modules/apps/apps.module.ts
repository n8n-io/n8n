import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'apps' })
export class AppsModule implements ModuleInterface {
	async init() {
		await import('./apps.controller.js');
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

	async entities() {
		const { App } = await import('./app.entity.js');
		const { AppVersion } = await import('./app-version.entity.js');
		const { Page } = await import('./page.entity.js');

		return [App, AppVersion, Page];
	}
}
