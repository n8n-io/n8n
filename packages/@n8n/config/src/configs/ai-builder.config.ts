import { Config, Env } from '../decorators';

@Config
export class AiBuilderConfig {
	/**
	 * API key for the Anthropic (Claude) provider used by the AI workflow builder.
	 * When set, enables AI-powered workflow and node building.
	 */
	@Env('N8N_AI_ANTHROPIC_KEY')
	apiKey: string = '';
}
