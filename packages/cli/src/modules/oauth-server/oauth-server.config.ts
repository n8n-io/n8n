import { Config, Env, nonnegativeIntSchema } from '@n8n/config';

/**
 * IP rate limits for the OAuth server endpoints. Each limit accepts `0` to
 * disable IP rate limiting for its endpoint.
 */
@Config
export class OAuthServerConfig {
	/** Maximum number of client registration requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_REGISTER_RATE_LIMIT', nonnegativeIntSchema)
	rateLimitRegister: number = 10;

	/** Maximum number of authorize requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_AUTHORIZE_RATE_LIMIT', nonnegativeIntSchema)
	rateLimitAuthorize: number = 50;

	/** Maximum number of token requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_TOKEN_RATE_LIMIT', nonnegativeIntSchema)
	rateLimitToken: number = 20;

	/** Maximum number of revoke requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_REVOKE_RATE_LIMIT', nonnegativeIntSchema)
	rateLimitRevoke: number = 30;

	/**
	 * Maximum number of OAuth metadata discovery requests (the `.well-known/*`
	 * endpoints) per IP per 5 minutes.
	 */
	@Env('N8N_OAUTH_SERVER_WELL_KNOWN_RATE_LIMIT', nonnegativeIntSchema)
	rateLimitWellKnown: number = 100;
}
