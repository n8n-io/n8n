import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'apps' })
export class AppsModule implements ModuleInterface {
	async init() {
		await import('./apps.controller.js');
		await import('./serving/app-serving.controller.js');
	}

	async entities() {
		const { App } = await import('./app.entity.js');
		const { Page } = await import('./page.entity.js');

		return [App, Page];
	}
}
