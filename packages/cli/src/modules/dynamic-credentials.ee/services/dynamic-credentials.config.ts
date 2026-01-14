import { Config, Env } from '@n8n/config';

@Config
export class DynamicCredentialsConfig {
	/**
	 * Authentication token for the dynamic credentials endpoints.
	 */
	@Env('N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN')
	endpointAuthToken: string = '';
}
