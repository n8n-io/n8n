import { Config, Env } from '../decorators';

@Config
export class PublicApiConfig {
	/** Whether to disable the Public API */
	@Env('N8N_PUBLIC_API_DISABLED')
	disabled: boolean = false;

	/** Path segment for the Public API */
	@Env('N8N_PUBLIC_API_ENDPOINT')
	path: string = 'api';

	/** Whether to disable the Swagger UI for the Public API */
	@Env('N8N_PUBLIC_API_SWAGGERUI_DISABLED')
	swaggerUiDisabled: boolean = false;
}
