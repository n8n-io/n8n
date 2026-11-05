import { Config, Env, positiveIntSchema } from '@n8n/config';

@Config
export class JwksConfig {
	/**
	 * Maximum number of JWKS requests per IP per minute. The env var keeps its
	 * `OAUTH_JWE` name from when only the JWE module served this endpoint.
	 * Must be positive: the rate limiter blocks every request at a limit of 0.
	 */
	@Env('N8N_OAUTH_JWE_JWKS_PER_MINUTE', positiveIntSchema)
	rateLimitJwksPerMinute: number = 60;
}
