import { Config, Env } from '../decorators';

@Config
export class PublicApiConfig {
	/** Whether to disable the Public API */
	@Env('N8N_PUBLIC_API_DISABLED')
	readonly disabled: boolean = false;

	/** Path segment for the Public API */
	@Env('N8N_PUBLIC_API_ENDPOINT')
	readonly path: string = 'api';

	/** Whether to disable the Swagger UI for the Public API */
	@Env('N8N_PUBLIC_API_SWAGGERUI_DISABLED')
	readonly swaggerUiDisabled: boolean = false;
}
