import { Config, Env } from '../decorators';

@Config
export class PersonalizationConfig {
	/** Whether to enable personalization features. */
	@Env('N8N_PERSONALIZATION_ENABLED')
	enabled: boolean = true;
}
