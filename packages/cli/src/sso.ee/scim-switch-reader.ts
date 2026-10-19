import { Service } from '@n8n/di';

/**
 * Reads the SCIM provisioning switch for SSO code, for `sso-login-disabled`.
 * The SCIM module sets the read when it starts, so that SSO code needs no
 * import of that module.
 */
@Service()
export class ScimSwitchReader {
	private read?: () => Promise<boolean>;

	register(read: () => Promise<boolean>) {
		this.read = read;
	}

	/**
	 * Without the active SCIM module, for example without `feat:scim`, SCIM
	 * counts as off. This includes the SSO env loader at startup, which runs
	 * before the modules start. The SCIM module then turns SCIM off at its own
	 * start.
	 */
	async isEnabled(): Promise<boolean> {
		if (!this.read) return false;

		return await this.read();
	}
}
