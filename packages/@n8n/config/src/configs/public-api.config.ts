import { Config, Env, Nested } from '../decorators';
import { nonnegativeIntSchema, positiveIntSchema } from '../schemas';

/** Requests per API key. A limit of 0 turns off that layer. */
@Config
export class PublicApiRateLimitConfig {
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENABLED')
	enabled: boolean = false;

	/** Read requests for one API key across all endpoints. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', nonnegativeIntSchema)
	globalReadLimit: number = 1_200;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_WINDOW_SECONDS', positiveIntSchema)
	globalReadWindowSeconds: number = 60;

	/** Write requests for one API key across all endpoints. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_LIMIT', nonnegativeIntSchema)
	globalWriteLimit: number = 600;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_WINDOW_SECONDS', positiveIntSchema)
	globalWriteWindowSeconds: number = 60;

	/** Read requests for one API key on one endpoint. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_LIMIT', nonnegativeIntSchema)
	endpointReadLimit: number = 1_000;

	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_WINDOW_SECONDS', positiveIntSchema)
	endpointReadWindowSeconds: number = 60;

	/** Write requests for one API key on one endpoint. */
	@Env('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_LIMIT', nonnegativeIntSchema)
	endpointWriteLimit: number = 500;

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
