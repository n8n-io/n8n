import type { FrontendModuleSettings } from '@n8n/api-types';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * SCIM 2.0 module for user provisioning.
 * Implements System for Cross-domain Identity Management (RFC 7644) for
 * automated user lifecycle management.
 *
 * `feat:scim` activates the module. Before GA, its routes answer only while
 * the opt-in is on (`ScimOptInService`).
 */
@BackendModule({ name: 'scim', licenseFlag: 'feat:scim', instanceTypes: ['main'] })
export class ScimModule implements ModuleInterface {
	async init() {
		// Import controllers to register routes
		await import('./scim.controller.js');
		await import('./scim-discovery.controller.js');
		await import('./scim-token.controller.js');

		const { ScimTokenRevocationListener } = await import('./scim-token-revocation.listener.js');
		Container.get(ScimTokenRevocationListener);

		const { ScimOptInService } = await import('./scim-opt-in.service.js');
		Container.get(ScimOptInService).startSettingsRefresh();
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 * The frontend reads the opt-in here, because the routes use one value
	 * for the whole instance and the frontend flag client evaluates per user.
	 */
	async settings() {
		const { ScimSettingsService } = await import('./scim-settings.service.js');
		const { ScimOptInService } = await import('./scim-opt-in.service.js');

		const [scimEnabled, optIn] = await Promise.all([
			Container.get(ScimSettingsService).isEnabled(),
			Container.get(ScimOptInService).evaluate(),
		]);

		return {
			scimEnabled,
			available: optIn.available,
			optInSource: optIn.source,
		} satisfies FrontendModuleSettings['scim'];
	}

	@OnShutdown()
	async shutdown() {}
}
