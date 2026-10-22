import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * SCIM 2.0 module for user provisioning.
 * Implements System for Cross-domain Identity Management (RFC 7644) for
 * automated user lifecycle management.
 */
@BackendModule({ name: 'scim', licenseFlag: 'feat:scim', instanceTypes: ['main'] })
export class ScimModule implements ModuleInterface {
	async init() {
		// Import controllers to register routes
		await import('./scim.controller.js');
		await import('./scim-discovery.controller.js');
		await import('./scim-token.controller.js');
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 * The response shape will be `{ scim: { scimEnabled: boolean } }`.
	 */
	async settings() {
		const { ScimSettingsService } = await import('./scim-settings.service.js');

		return { scimEnabled: await Container.get(ScimSettingsService).isEnabled() };
	}

	@OnShutdown()
	async shutdown() {}
}
