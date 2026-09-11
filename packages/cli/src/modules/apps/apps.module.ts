import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'apps' })
export class AppsModule implements ModuleInterface {
	async init() {
		const { registerStaticRenderers } = await import('./rendering/register-static-renderers.js');
		registerStaticRenderers();
		const { registerDataRenderers } = await import('./runtime/register-data-renderers.js');
		registerDataRenderers();

		await import('./apps.controller.js');
		// Before the serving controller: Express answers an OPTIONS request from the
		// first router whose path matches, and the serving GET route matches every
		// `/apps/*` path.
		await import('./actions/app-actions.controller.js');
		await import('./serving/app-agent-chat.controller.js');
		await import('./serving/app-serving.controller.js');
	}

	async entities() {
		const { App } = await import('./app.entity.js');
		const { AppVersion } = await import('./app-version.entity.js');
		const { Page } = await import('./page.entity.js');

		return [App, AppVersion, Page];
	}
}
