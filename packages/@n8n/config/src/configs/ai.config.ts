import { Config, Env } from '../decorators';

@Config
export class AiConfig {
	/** Whether AI features are enabled. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;

	get openAiDefaultHeaders(): Record<string, string> {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' };
	}
}
