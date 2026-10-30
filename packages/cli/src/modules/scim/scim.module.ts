import type { FrontendModuleSettings } from '@n8n/api-types';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * SCIM 2.0 module for user provisioning.
 * Implements System for Cross-domain Identity Management (RFC 7644) for
 * automated user lifecycle management.
 *
 * `feat:scim` activates the module. Before general availability, its routes
 * answer only while `N8N_ENV_FEAT_SCIM` is `true` (`scim-opt-in.ts`). SCIM
 * provisioning works only while SAML or OIDC single sign-on is on
 * (`ScimSsoService`).
 */
@BackendModule({ name: 'scim', licenseFlag: 'feat:scim', instanceTypes: ['main'] })
export class ScimModule implements ModuleInterface {
	async init() {
		// Import controllers to register routes
		await import('./scim.controller.js');
		await import('./scim-discovery.controller.js');
		await import('./scim-token.controller.js');

		// The SAML and OIDC modules init before this module, so the single
		// sign-on state is loaded here.
		const { ScimSsoService } = await import('./scim-sso.service.js');
		await Container.get(ScimSsoService).init();
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 * The Users page shows SCIM indicators only while SCIM is enabled and a
	 * token exists, so the token routes refresh these settings.
	 */
	async settings() {
		const { ScimSettingsService } = await import('./scim-settings.service.js');
		const { ScimTokenService } = await import('./scim-token.service.js');

		const [scimEnabled, { hasToken }] = await Promise.all([
			Container.get(ScimSettingsService).isEnabled(),
			Container.get(ScimTokenService).getTokenInfo(),
		]);

		return {
			scimEnabled,
			hasToken,
		} satisfies FrontendModuleSettings['scim'];
	}

	@OnShutdown()
	async shutdown() {}
}
