import { Config, Env } from '../decorators';

@Config
export class LicenseConfig {
	/** License server URL to retrieve license. */
	@Env('N8N_LICENSE_SERVER_URL')
	serverUrl: string = 'https://license.n8n.io/v1';

	/** Whether autorenewal for licenses is enabled. */
	@Env('N8N_LICENSE_AUTO_RENEW_ENABLED')
	autoRenewalEnabled: boolean = true;

	/** How long (in seconds) before expiry a license should be autorenewed. */
	@Env('N8N_LICENSE_AUTO_RENEW_OFFSET')
	autoRenewOffset: number = 60 * 60 * 72; // 72 hours

	/** Activation key to initialize license. */
	@Env('N8N_LICENSE_ACTIVATION_KEY')
	activationKey: string = '';

	/** Tenant ID used by the license manager SDK, e.g. for self-hosted, sandbox, embed, cloud. */
	@Env('N8N_LICENSE_TENANT_ID')
	tenantId: number = 1;

	/** Ephemeral license certificate. See: https://github.com/n8n-io/license-management?tab=readme-ov-file#concept-ephemeral-entitlements */
	@Env('N8N_LICENSE_CERT')
	cert: string = '';
}
