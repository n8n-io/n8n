import { Config, Env } from '../decorators';

@Config
export class DynamicBannersConfig {
	/** URL to fetch dynamic banner content from (for example, in-app announcements). */
	@Env('N8N_DYNAMIC_BANNERS_ENDPOINT')
	endpoint: string = 'https://api.n8n.io/api/banners';

	/** Whether to fetch and show dynamic banners (for example, announcements) from the endpoint. */
	@Env('N8N_DYNAMIC_BANNERS_ENABLED')
	enabled: boolean = true;
}
