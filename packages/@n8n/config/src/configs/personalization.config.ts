import { Config, Env } from '../decorators';

@Config
export class PersonalizationConfig {
	@Env('N8N_PERSONALIZATION_ENABLED')
	enabled: boolean = true;
}
