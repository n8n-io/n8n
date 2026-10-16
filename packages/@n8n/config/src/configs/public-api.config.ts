import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';
import { nonnegativeIntSchema, positiveIntSchema } from '../schemas';

const rateLimitModeSchema = z.enum(['enforce', 'observe']);
type RateLimitMode = z.infer<typeof rateLimitModeSchema>;

/** Requests per API key. A limit of 0 turns off that layer. */
@Config
export class PublicApiRateLimitConfig {
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENABLED')
	enabled: boolean = false;

	/**
	 * How n8n applies the Public API rate limits. One of `enforce` or `observe`. With `enforce`, a
	 * request over a limit gets a 429 response. With `observe`, n8n counts requests but never
	 * blocks one, and doesn't add rate-limit headers to responses. Use `observe` to measure your
	 * traffic before you turn on blocking.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_MODE', rateLimitModeSchema)
	mode: RateLimitMode = 'enforce';

	/** Read requests for one API key across all endpoints. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', nonnegativeIntSchema)
	globalReadLimit: number = 1_200;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_WINDOW_SECONDS', positiveIntSchema)
	globalReadWindowSeconds: number = 60;

	/** Write requests for one API key across all endpoints. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_LIMIT', nonnegativeIntSchema)
	globalWriteLimit: number = 300;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_WINDOW_SECONDS', positiveIntSchema)
	globalWriteWindowSeconds: number = 60;

	/** Read requests for one API key on one endpoint. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_LIMIT', nonnegativeIntSchema)
	endpointReadLimit: number = 600;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_WINDOW_SECONDS', positiveIntSchema)
	endpointReadWindowSeconds: number = 60;

	/** Write requests for one API key on one endpoint. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_LIMIT', nonnegativeIntSchema)
	endpointWriteLimit: number = 200;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_WINDOW_SECONDS', positiveIntSchema)
	endpointWriteWindowSeconds: number = 60;
}

@Config
export class PublicApiConfig {
	/** When true, the public API is disabled and its routes are not registered. */
	@Env('N8N_PUBLIC_API_DISABLED')
	disabled: boolean = false;

	/** URL path segment for the Public API (for example, /api/v1/...). */
	@Env('N8N_PUBLIC_API_ENDPOINT')
	path: string = 'api';

	/** When true, the Swagger UI for the Public API is not served. */
	@Env('N8N_PUBLIC_API_SWAGGERUI_DISABLED')
	swaggerUiDisabled: boolean = false;

	@Nested
	rateLimit: PublicApiRateLimitConfig;
}
