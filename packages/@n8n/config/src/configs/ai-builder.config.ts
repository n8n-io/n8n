import { Config, Env } from '../decorators';

@Config
export class AiBuilderConfig {
	/** Keys for local service */
	@Env('N8N_AI_ANTHROPIC_KEY')
	apiKey: string = '';
}
