import { Config, Env } from '../decorators';

@Config
export class AiConfig {
	/** Whether AI features are enabled. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;

	/** Anthropic API key for AI features. */
	@Env('N8N_AI_ANTHROPIC_KEY')
	anthropicApiKey: string = '';
}
