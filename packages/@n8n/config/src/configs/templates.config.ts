import { Config, Env } from '../decorators';

@Config
export class TemplatesConfig {
	/** Whether to load workflow templates. */
	@Env('N8N_TEMPLATES_ENABLED')
	enabled: boolean = true;

	/** Host to retrieve workflow templates from endpoints. */
	@Env('N8N_TEMPLATES_HOST')
	host: string = 'https://api.n8n.io/api/';
}
