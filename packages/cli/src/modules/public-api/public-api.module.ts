import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Handles CLI/public-API OAuth flows and connected client management.
 * Uses shared OAuth services from the oauth module.
 */
@BackendModule({ name: 'public-api', instanceTypes: ['main'] })
export class PublicApiModule implements ModuleInterface {
	async init() {
		await import('./controllers/cli-oauth.controller');
		await import('./controllers/oauth-consent.controller');
		await import('./controllers/oauth-clients.controller');
	}
}
