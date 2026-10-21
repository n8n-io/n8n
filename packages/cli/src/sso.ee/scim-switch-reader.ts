import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/** The settings row of the SCIM provisioning switch. */
export const SCIM_PROVISIONING_ENABLED_KEY = 'scim.provisioning.enabled';

/**
 * Reads the SCIM provisioning switch for SSO code, for `sso-login-disabled`.
 * The SCIM module sets the read when it starts, so that SSO code needs no
 * import of that module.
 */
@Service()
export class ScimSwitchReader {
	private read?: () => Promise<boolean>;

	constructor(
		private readonly licenseState: LicenseState,
		private readonly settingsRepository: SettingsRepository,
	) {}

	register(read: () => Promise<boolean>) {
		this.read = read;
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
}
