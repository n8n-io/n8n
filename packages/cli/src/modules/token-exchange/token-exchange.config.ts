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

	/** Maximum number of embed logins per ip per minute. */
	@Env('N8N_TOKEN_EXCHANGE_EMBED_LOGIN_PER_MINUTE')
	rateLimitEmbedLogin: number = 20;

	/** Maximum number of token exchanges per ip per minute. */
	@Env('N8N_TOKEN_EXCHANGE_TOKEN_EXCHANGE_PER_MINUTE')
	rateLimitTokenExchange: number = 20;
}
