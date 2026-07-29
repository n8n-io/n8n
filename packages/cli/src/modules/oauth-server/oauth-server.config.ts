import { Config, Env } from '@n8n/config';
import { z } from 'zod';

// Each limit accepts `0` to disable IP rate limiting for its endpoint.
const rateLimitSchema = z.number({ coerce: true }).int().nonnegative();

/**
 * IP rate limits for the OAuth server endpoints.
 */
@Config
export class OAuthServerConfig {
	/** Maximum number of client registration requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_REGISTER_RATE_LIMIT', rateLimitSchema)
	rateLimitRegister: number = 10;

	/** Maximum number of authorize requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_AUTHORIZE_RATE_LIMIT', rateLimitSchema)
	rateLimitAuthorize: number = 50;

	/** Maximum number of token requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_TOKEN_RATE_LIMIT', rateLimitSchema)
	rateLimitToken: number = 20;

	/** Maximum number of revoke requests per IP per 5 minutes. */
	@Env('N8N_OAUTH_SERVER_REVOKE_RATE_LIMIT', rateLimitSchema)
	rateLimitRevoke: number = 30;

	/**
	 * Maximum number of OAuth metadata discovery requests (the `.well-known/*`
	 * endpoints) per IP per 5 minutes.
	 */
	@Env('N8N_OAUTH_SERVER_WELL_KNOWN_RATE_LIMIT', rateLimitSchema)
	rateLimitWellKnown: number = 100;
}
