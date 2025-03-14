import { Config, Env } from '../decorators';

@Config
export class InsightsConfig {
	/**
	 * Enable all insights collection.
	 * Default: false
	 */
	@Env('N8N_INSIGHTS_ENABLED')
	enabled: boolean = false;
}
