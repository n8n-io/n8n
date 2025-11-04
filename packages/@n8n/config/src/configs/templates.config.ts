import { Config, Env } from '../decorators';

@Config
export class TemplatesConfig {
	/**
	 * Whether to load workflow templates.
	 * Templates are disabled by default to prevent external connections.
	 * Set N8N_TEMPLATES_ENABLED=true to enable template library from n8n.io
	 */
	@Env('N8N_TEMPLATES_ENABLED')
	enabled: boolean = false;

	/**
	 * Host to retrieve workflow templates from endpoints.
	 * Note: This connects to external n8n servers.
	 */
	@Env('N8N_TEMPLATES_HOST')
	host: string = 'https://api.n8n.io/api/';
}
