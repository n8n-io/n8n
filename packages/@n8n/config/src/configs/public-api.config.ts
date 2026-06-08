import { Config, Env } from '../decorators';

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

	/**
	 * When true, the n8n-packages public API endpoints are enabled. This feature is
	 * currently in beta and disabled by default.
	 */
	@Env('N8N_PUBLIC_API_PACKAGES_ENABLED')
	packagesEnabled: boolean = false;
}
