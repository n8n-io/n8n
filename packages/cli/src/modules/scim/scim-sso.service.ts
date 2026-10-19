import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { isSamlOrOidcLoginEnabled } from '@/sso.ee/sso-helpers';

import { ScimSettingsService } from './scim-settings.service';

/**
 * SCIM provisioning needs SAML or OIDC single sign-on. SCIM users have no
 * usable password, so they can sign in only through the identity provider.
 *
 * The cascade goes one way: single sign-on off turns SCIM off, and single
 * sign-on on never turns SCIM on. The cascade keeps the token and the other
 * SCIM settings, so the identity provider needs no change when an admin
 * enables SCIM again.
 */
@Service()
export class ScimSsoService {
	private listening = false;

	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly scimSettingsService: ScimSettingsService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	isSsoEnabled(): boolean {
		return isSamlOrOidcLoginEnabled();
	}

	/**
	 * Turns SCIM off on each later `sso-login-disabled` event, and once now.
	 * The check now covers single sign-on that turned off while the instance
	 * was down, for example an expired license or a changed env variable.
	 */
	async init() {
		if (!this.listening) {
			this.listening = true;
			this.eventService.on('sso-login-disabled', async ({ protocol }) => {
				await this.turnOffScim(`${protocol.toUpperCase()} single sign-on turned off`);
			});
		}

		if (!this.isSsoEnabled()) await this.turnOffScim('single sign-on is off at startup');
	}

	/**
	 * A failure must not reach the caller: the single sign-on change is
	 * already saved, and the SCIM routes reject requests while single sign-on
	 * is off.
	 */
	private async turnOffScim(reason: string) {
		try {
			if (!(await this.scimSettingsService.isEnabled())) return;
			await this.scimSettingsService.setEnabled(false);
		} catch (error) {
			this.logger.error('SCIM: Failed to turn off SCIM provisioning without single sign-on', {
				error,
			});
			return;
		}

		this.logger.info(
			`SCIM provisioning turned off, because ${reason}. The SCIM token and the SCIM settings are kept.`,
		);

		try {
			// `/rest/module-settings` serves a cached snapshot.
			await this.moduleRegistry.refreshModuleSettings('scim');
		} catch (error) {
			this.logger.warn('SCIM: Failed to refresh the module settings', { error });
		}
	}
}
