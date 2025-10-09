import { Config, Env } from '../decorators';

@Config
export class VersionNotificationsConfig {
	/** Whether to request notifications about new n8n versions */
	@Env('N8N_VERSION_NOTIFICATIONS_ENABLED')
	enabled: boolean = true;

	/** Endpoint to retrieve n8n version information from */
	@Env('N8N_VERSION_NOTIFICATIONS_ENDPOINT')
	endpoint: string = 'https://api.n8n.io/api/versions/';

	/** Whether to request What's New articles. Also requires `N8N_VERSION_NOTIFICATIONS_ENABLED` to be enabled */
	@Env('N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED')
	whatsNewEnabled: boolean = true;

	/** Endpoint to retrieve "What's New" articles from */
	@Env('N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT')
	whatsNewEndpoint: string = 'https://api.n8n.io/api/whats-new';

	/** URL for versions panel to page instructing user on how to update n8n instance */
	@Env('N8N_VERSION_NOTIFICATIONS_INFO_URL')
	infoUrl: string = 'https://docs.n8n.io/hosting/installation/updating/';
}
