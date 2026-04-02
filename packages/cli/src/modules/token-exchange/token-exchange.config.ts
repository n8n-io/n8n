import { Config, Env } from '@n8n/config';

@Config
export class TokenExchangeConfig {
	/** Whether the token exchange endpoint (POST /auth/oauth/token) is enabled. */
	@Env('N8N_TOKEN_EXCHANGE_ENABLED')
	enabled: boolean = false;

	/** Maximum lifetime in seconds for an issued token. */
	@Env('N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL')
	maxTokenTtl: number = 900;

	/** If true (default), delegation scope checks are enforced and under-scoped actors are rejected. If false, failures emit a warning but the request proceeds. */
	@Env('N8N_TOKEN_EXCHANGE_ENFORCE_DELEGATION')
	enforceDelegation: boolean = true;
}
