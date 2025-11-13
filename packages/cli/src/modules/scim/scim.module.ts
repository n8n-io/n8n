import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

/**
 * SCIM 2.0 module for user provisioning
 * Implements System for Cross-domain Identity Management (SCIM) protocol
 * for automated user lifecycle management
 */
@BackendModule({ name: 'scim' })
export class ScimModule implements ModuleInterface {
	async init() {
		// Import controllers to register routes
		await import('./scim.controller');
		await import('./scim-token.controller');
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 * The response shape will be `{ scim: { scimEnabled: boolean } }`.
	 */
	async settings() {
		// For now, SCIM is always enabled when the module is loaded
		// In the future, this could be controlled via feature flags or settings
		return { scimEnabled: true };
	}

	@OnShutdown()
	async shutdown() {}
}
