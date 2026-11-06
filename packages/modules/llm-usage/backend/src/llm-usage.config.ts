import { Config, Env } from '@n8n/config';

@Config
export class LlmUsageConfig {
	/**
	 * URL of the price list that n8n uses to estimate the cost of LLM calls. Change it
	 * only for development or testing. When empty, n8n stores LLM calls without a cost.
	 */
	@Env('N8N_LLM_USAGE_CATALOG_URL')
	catalogUrl: string = '';
}
