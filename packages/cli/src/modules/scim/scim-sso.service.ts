import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { SettingsRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { InternalServerError } from '@n8n/errors';

import { ScimSwitchReader } from '@/sso.ee/scim-switch-reader';
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
	constructor(
		private readonly logger: Logger,
		private readonly scimSettingsService: ScimSettingsService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly scimSwitchReader: ScimSwitchReader,
		private readonly settingsRepository: SettingsRepository,
	) {}

	isSsoEnabled(): boolean {
		return isSamlOrOidcLoginEnabled();
	}

	/**
	 * Tells if single sign-on is on, and also reads the saved authentication
	 * method in `ctx`. Another main can turn single sign-on off before this
	 * main gets the reload message, so the method in memory can be old. The
	 * other main saves the method before its SSO-off cascade starts.
	 */
	async isSsoEnabledInTransaction(ctx: OperationContext): Promise<boolean> {
		if (!this.isSsoEnabled()) return false;

		const saved = await this.settingsRepository.findByKeyInContext(
			'userManagement.authenticationMethod',
			ctx,
		);
		// Without a saved method, the method in memory is the newest one.
		return !saved || saved.value === 'saml' || saved.value === 'oidc';
	}

	/**
	 * Turns SCIM off each time SSO code turns single sign-on off, and once
	 * now. The check now covers single sign-on that turned off while the
	 * instance was down, for example an expired license or a changed env
	 * variable.
	 *
	 * SSO code reads the switch and turns SCIM off through
	 * `ScimSwitchReader`, which this module sets here. The read uses the saved
	 * switch and its lock, as `turnOff` does. Thus `sso-login-disabled` also
	 * reports an enable that the cache does not show yet.
	 */
	async init() {
		this.scimSwitchReader.register(
			async () => await this.scimSettingsService.isSavedEnabled(),
			async (protocol) =>
				await this.turnOffScim(`${protocol.toUpperCase()} single sign-on turned off`),
		);

		if (this.isSsoEnabled()) return;

		try {
			await this.turnOffScim('single sign-on is off at startup');
		} catch {
			// `turnOffScim` logs the failure. The start continues, because the
			// SCIM routes reject requests while single sign-on is off.
		}
	}

	/**
	 * A failure reaches the caller. Thus the request that turns single sign-on
	 * off fails, and the admin knows that SCIM is still on. That request saves
	 * only part of the change and does not tell the other mains. The message
	 * thus tells the admin to turn SCIM off and then single sign-on again.
	 * Until then, this main rejects SCIM requests.
	 */
	private async turnOffScim(reason: string) {
		try {
			if (!(await this.scimSettingsService.turnOff())) return;
		} catch (error) {
			this.logger.error('SCIM: Failed to turn off SCIM provisioning without single sign-on', {
				error,
			});
			throw new InternalServerError(
				'SCIM provisioning did not turn off, so single sign-on did not turn off fully. Turn off SCIM provisioning in the SCIM settings. Then turn off single sign-on again.',
				error,
			);
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
