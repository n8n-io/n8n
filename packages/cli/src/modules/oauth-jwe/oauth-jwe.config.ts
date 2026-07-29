import { Config, Env } from '@n8n/config';

@Config
export class OAuthJweConfig {
	/** Maximum number of JWKS requests per IP per minute. */
	@Env('N8N_OAUTH_JWE_JWKS_PER_MINUTE')
	rateLimitJwksPerMinute: number = 60;
}
