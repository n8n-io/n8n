import { Config, Env } from '../decorators';

@Config
export class AiConfig {
	/** Whether AI features are enabled. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;

	/**
	 * Default timeout for AI HTTP requests in milliseconds.
	 * This timeout controls how long to wait for responses from AI services.
	 * Aligned with EXECUTIONS_TIMEOUT_MAX (1 hour) to ensure AI requests don't exceed workflow execution limits.
	 * Default: 3600000 (1 hour)
	 */
	@Env('N8N_AI_TIMEOUT_MAX')
	timeout: number = 3600000;

	/** Whether to allow sending actual parameter data to AI services. */
	@Env('N8N_AI_ALLOW_SENDING_PARAMETER_VALUES')
	allowSendingParameterValues: boolean = true;

	get openAiDefaultHeaders(): Record<string, string> {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' };
	}
}
