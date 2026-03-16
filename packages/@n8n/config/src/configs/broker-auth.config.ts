import { Config, Env } from '../decorators';

@Config
export class BrokerAuthConfig {
	/** URL of the OAuth broker service. When set, enables broker-managed OAuth. */
	@Env('N8N_OAUTH_BROKER_URL')
	url: string = '';

	/**
	 * Whether broker-managed OAuth is enabled.
	 * Set to `false` to disable even when `N8N_OAUTH_BROKER_URL` is configured.
	 */
	@Env('N8N_BROKER_AUTH_ENABLED')
	enabled: boolean = true;
}
