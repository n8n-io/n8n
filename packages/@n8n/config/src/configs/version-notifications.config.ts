import { Config, Env } from '../decorators';

@Config
export class VersionNotificationsConfig {
	/** Whether to check for and show in-app notifications about new n8n versions. */
	@Env('N8N_VERSION_NOTIFICATIONS_ENABLED')
	enabled: boolean = true;

	/** URL used to fetch current n8n version information. */
	@Env('N8N_VERSION_NOTIFICATIONS_ENDPOINT')
	endpoint: string = 'https://api.n8n.io/api/versions/';

	/** Whether to fetch and show "What's New" content. Requires version notifications to be enabled. */
	@Env('N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED')
	whatsNewEnabled: boolean = true;

	/** URL used to fetch "What's New" articles. */
	@Env('N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT')
	whatsNewEndpoint: string = 'https://api.n8n.io/api/whats-new';

	/** URL linked from the versions panel (for example, upgrade instructions). */
	@Env('N8N_VERSION_NOTIFICATIONS_INFO_URL')
	infoUrl: string = 'https://docs.n8n.io/hosting/installation/updating/';
}
