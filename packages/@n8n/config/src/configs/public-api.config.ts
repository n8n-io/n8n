import { Config, Env, Nested } from '../decorators';
import { nonnegativeIntSchema, positiveIntSchema } from '../schemas';

@Config
export class PublicApiRateLimitConfig {
	/**
	 * Whether n8n limits how many public API requests each API key can make. A request over a
	 * limit gets a `429` response. n8n counts only requests that use an API key.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENABLED')
	enabled: boolean = false;

	/**
	 * Maximum number of read requests (`GET`) that one API key can make to all public
	 * API endpoints together in each window. Set to 0 for no limit.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', nonnegativeIntSchema)
	globalReadLimit: number = 1_200;

	/**
	 * Length of the window for `N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT`, in seconds. The
	 * count starts again when the window ends.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_WINDOW_SECONDS', positiveIntSchema)
	globalReadWindowSeconds: number = 60;

	/**
	 * Maximum number of write requests (`POST`, `PUT`, `PATCH`, and `DELETE`) that one API key
	 * can make to all public API endpoints together in each window. Set to 0 for no limit.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_LIMIT', nonnegativeIntSchema)
	globalWriteLimit: number = 600;

	/**
	 * Length of the window for `N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_LIMIT`, in seconds. The
	 * count starts again when the window ends.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_WINDOW_SECONDS', positiveIntSchema)
	globalWriteWindowSeconds: number = 60;

	/**
	 * Maximum number of read requests (`GET`) that one API key can make to each public
	 * API endpoint in each window. An endpoint is a method and a path, so `GET /workflows/{id}` is
	 * one endpoint for every workflow ID. Set to 0 for no limit.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_LIMIT', nonnegativeIntSchema)
	endpointReadLimit: number = 1_000;

	/**
	 * Length of the window for `N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_LIMIT`, in seconds. The
	 * count starts again when the window ends.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_WINDOW_SECONDS', positiveIntSchema)
	endpointReadWindowSeconds: number = 60;

	/**
	 * Maximum number of write requests (`POST`, `PUT`, `PATCH`, and `DELETE`) that one API key
	 * can make to each public API endpoint in each window. An endpoint is a method and a path, so
	 * `DELETE /workflows/{id}` is one endpoint for every workflow ID. Set to 0 for no limit.
	 */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_LIMIT', nonnegativeIntSchema)
	endpointWriteLimit: number = 500;

	/**
	 * Length of the window for `N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_LIMIT`, in seconds. The
	 * count starts again when the window ends.
	 */
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
