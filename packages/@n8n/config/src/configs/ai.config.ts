import { Config, Env } from '../decorators';

@Config
export class AiConfig {
	/** Whether AI features (such as AI nodes and AI assistant) are enabled globally. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;

	/**
	 * Maximum time in milliseconds to wait for an HTTP response from an AI service.
	 * Matches the maximum workflow execution timeout, EXECUTIONS_TIMEOUT_MAX (1 hour) so AI calls do not outlive executions.
	 * Default: 3600000 (1 hour).
	 */
	@Env('N8N_AI_TIMEOUT_MAX')
	timeout: number = 3600000;

	/**
	 * Whether workflow and node parameter values may be sent to AI providers.
	 * When false, only structure or placeholders are sent.
	 */
	@Env('N8N_AI_ALLOW_SENDING_PARAMETER_VALUES')
	allowSendingParameterValues: boolean = true;

	/** Whether to persist AI workflow builder sessions to the database. */
	@Env('N8N_AI_PERSIST_BUILDER_SESSIONS')
	persistBuilderSessions: boolean = false;

	get openAiDefaultHeaders(): Record<string, string> {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' };
	}
}
