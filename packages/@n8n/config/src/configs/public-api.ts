import { Config, Env } from '../decorators';

@Config
export class PublicApiConfig {
	/** Whether to disable the Public API */
	@Env('N8N_PUBLIC_API_DISABLED')
	disabled = false;

	/** Path segment for the Public API */
	@Env('N8N_PUBLIC_API_ENDPOINT')
	path = 'api';

	/** Whether to disable the Swagger UI for the Public API */
	@Env('N8N_PUBLIC_API_SWAGGERUI_DISABLED')
	swaggerUiDisabled = false;
}
