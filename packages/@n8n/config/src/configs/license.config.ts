import { Config, Env } from '../decorators';

@Config
export class LicenseConfig {
	/** URL of the license server used to validate and refresh licenses. */
	@Env('N8N_LICENSE_SERVER_URL')
	serverUrl: string = 'https://license.n8n.io/v1';

	/** Whether to automatically renew licenses before they expire. */
	@Env('N8N_LICENSE_AUTO_RENEW_ENABLED')
	autoRenewalEnabled: boolean = true;

	/** Activation key used to activate or upgrade the instance license. */
	@Env('N8N_LICENSE_ACTIVATION_KEY')
	activationKey: string = '';

	/** Whether to release floating entitlements back to the pool when the instance shuts down. */
	@Env('N8N_LICENSE_DETACH_FLOATING_ON_SHUTDOWN')
	detachFloatingOnShutdown: boolean = true;

	/** Tenant identifier for the license SDK (for example, self-hosted, sandbox, embed, cloud). */
	@Env('N8N_LICENSE_TENANT_ID')
	tenantId: number = 1;

	/** Ephemeral license certificate. See: https://github.com/n8n-io/license-management?tab=readme-ov-file#concept-ephemeral-entitlements */
	@Env('N8N_LICENSE_CERT')
	cert: string = '';
}
