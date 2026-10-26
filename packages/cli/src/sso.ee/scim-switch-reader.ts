import { LicenseState, Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/** The settings row of the SCIM provisioning switch. */
export const SCIM_PROVISIONING_ENABLED_KEY = 'scim.provisioning.enabled';

/**
 * Connects SSO code to the SCIM provisioning switch, for
 * `sso-login-disabled`. The SCIM module sets the read and the turn-off when
 * it starts, so that SSO code needs no import of that module.
 */
@Service()
export class ScimSwitchReader {
	private read?: () => Promise<boolean>;

	private turnOffScim?: (protocol: 'saml' | 'oidc') => Promise<void>;

	constructor(
		private readonly licenseState: LicenseState,
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
	) {}

	register(read: () => Promise<boolean>, turnOff: (protocol: 'saml' | 'oidc') => Promise<void>) {
		this.read = read;
		this.turnOffScim = turnOff;
	}

	/**
	 * Without `feat:scim` the SCIM module does not start, so SCIM counts as
	 * off. The SSO env loader runs at startup, before the modules start. For
	 * it, this reads the saved switch, so that the event tells the state from
	 * before the start. The SCIM module then turns SCIM off at its own start.
	 */
	async isEnabled(): Promise<boolean> {
		if (this.read) return await this.read();
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.SCIM)) return false;

		const row = await this.settingsRepository.findByKey(SCIM_PROVISIONING_ENABLED_KEY);
		return row?.value === 'true';
	}

	/**
	 * Turns SCIM off, because `protocol` sign-in turned off. An error reaches
	 * the caller.
	 *
	 * Without the SCIM module, for example while `feat:scim` is not licensed,
	 * this saves the switch as off. Otherwise SCIM would turn on again with
	 * single sign-on when the license comes back.
	 */
	async turnOff(protocol: 'saml' | 'oidc'): Promise<void> {
		if (this.turnOffScim) {
			await this.turnOffScim(protocol);
			return;
		}

		const row = await this.settingsRepository.findByKey(SCIM_PROVISIONING_ENABLED_KEY);
		if (row?.value !== 'true') return;

		await this.settingsRepository.upsertByKey(SCIM_PROVISIONING_ENABLED_KEY, 'false', true, {});
		// The SCIM module reads the cache before the settings table.
		await this.cacheService.set(SCIM_PROVISIONING_ENABLED_KEY, 'false');

		this.logger.info(
			`SCIM provisioning turned off, because ${protocol.toUpperCase()} single sign-on turned off. The SCIM token and the SCIM settings are kept.`,
		);
	}
}
