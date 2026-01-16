import { Config, Env } from '@n8n/config';

@Config
export class DynamicCredentialsConfig {
	/**
	 * Comma-separated list of allowed CORS origins for dynamic credentials endpoints.
	 * Example: 'https://app.example.com,https://admin.example.com'
	 * When empty CORS is disabled and endpoints return 404 for preflight requests.
	 */
	@Env('N8N_DYNAMIC_CREDENTIALS_CORS_ORIGIN')
	corsOrigin: string = '';

	/**
	 * Whether to allow credentials (cookies, authorization headers) in CORS requests.
	 * Must be false when using wildcard (*) in N8N_DYNAMIC_CREDENTIALS_CORS_ORIGIN.
	 * Default: false
	 */
	@Env('N8N_DYNAMIC_CREDENTIALS_CORS_ALLOW_CREDENTIALS')
	corsAllowCredentials: boolean = false;
}
