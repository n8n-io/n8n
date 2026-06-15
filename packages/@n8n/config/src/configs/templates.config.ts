import { Config, Env } from '../decorators';

@Config
export class TemplatesConfig {
	/** Whether to enable loading and showing workflow templates. */
	@Env('N8N_TEMPLATES_ENABLED')
	enabled: boolean = true;

	/** Base URL for the workflow templates API. */
	@Env('N8N_TEMPLATES_HOST')
	host: string = 'https://api.n8n.io/api/';

	/** Base URL for fetching dynamic (contextual) templates. */
	@Env('N8N_DYNAMIC_TEMPLATES_HOST')
	dynamicTemplatesHost: string = 'https://dynamic-templates.n8n.io/templates';
}
