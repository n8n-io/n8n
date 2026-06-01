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

	/**
	 * Authentication token for the dynamic credentials endpoints.
	 */
	@Env('N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN')
	endpointAuthToken: string = '';

	/**
	 * Maximum requests per IP per minute to unauthenticated dynamic credential endpoints
	 * Default: 60
	 */
	@Env('N8N_DYNAMIC_CREDENTIALS_RATE_LIMIT_PER_MINUTE')
	rateLimitPerMinute: number = 60;

	/**
	 * Maximum requests per IP per minute to `POST /credentials/:id/authorize`.
	 * Default: 60.
	 */
	@Env('N8N_DYNAMIC_CREDENTIALS_AUTHORIZE_RATE_LIMIT_PER_MINUTE')
	rateLimitAuthorizePerMinute: number = 60;
}
