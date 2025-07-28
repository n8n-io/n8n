import { Config, Env } from '../decorators';

@Config
export class AiConfig {
	/** Whether AI features are enabled. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;
}
