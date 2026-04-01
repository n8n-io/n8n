import { Config, Env } from '@n8n/config';

@Config
export class TokenExchangeConfig {
	/** Whether the token exchange endpoint (POST /auth/oauth/token) is enabled. */
	@Env('N8N_TOKEN_EXCHANGE_ENABLED')
	enabled: boolean = false;

	/** Maximum lifetime in seconds for an issued token. */
	@Env('N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL')
	maxTokenTtl: number = 900;
}
