import { Config, Env } from '@n8n/config';

@Config
export class TokenExchangeConfig {
	/** Whether the token exchange endpoint (POST /auth/oauth/token) is enabled. */
	@Env('N8N_TOKEN_EXCHANGE_ENABLED')
	enabled: boolean = false;

	/** Whether the embed login endpoint (GET/POST /auth/embed) is enabled. */
	@Env('N8N_EMBED_LOGIN_ENABLED')
	embedEnabled: boolean = false;

	/** Maximum lifetime in seconds for an issued token. */
	@Env('N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL')
	maxTokenTtl: number = 900;

	/**
	 * JSON array of trusted key sources for JWT verification.
	 * Each entry is validated against `TrustedKeySourceSchema`.
	 *
	 * Can also be loaded from a file by setting `N8N_TOKEN_EXCHANGE_TRUSTED_KEYS_FILE`
	 * to a path — the `@Env` decorator reads the file contents automatically.
	 */
	@Env('N8N_TOKEN_EXCHANGE_TRUSTED_KEYS')
	trustedKeys: string = '';

	/** Interval in seconds between trusted key refresh runs (leader only). */
	@Env('N8N_TOKEN_EXCHANGE_KEY_REFRESH_INTERVAL_SECONDS')
	keyRefreshIntervalSeconds: number = 300;

	/** Interval in seconds between JTI cleanup runs. */
	@Env('N8N_TOKEN_EXCHANGE_JTI_CLEANUP_INTERVAL_SECONDS')
	jtiCleanupIntervalSeconds: number = 60;

	/** Maximum number of expired JTI rows to delete per cleanup run. */
	@Env('N8N_TOKEN_EXCHANGE_JTI_CLEANUP_BATCH_SIZE')
	jtiCleanupBatchSize: number = 1000;

	/** Maximum number of embed logins per ip per minute. */
	@Env('N8N_TOKEN_EXCHANGE_EMBED_LOGIN_PER_MINUTE')
	rateLimitEmbedLogin: number = 20;

	/** Maximum number of token exchanges per ip per minute. */
	@Env('N8N_TOKEN_EXCHANGE_TOKEN_EXCHANGE_PER_MINUTE')
	rateLimitTokenExchange: number = 20;
}
