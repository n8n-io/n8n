import { Config, Env } from '../decorators';

@Config
export class MultiMainSetupConfig {
	/** Whether to enable multi-main setup (if licensed) for scaling mode. */
	@Env('N8N_MULTI_MAIN_SETUP_ENABLED')
	enabled: boolean = false;

	/** Time to live (in seconds) for leader key in multi-main setup. */
	@Env('N8N_MULTI_MAIN_SETUP_KEY_TTL')
	ttl: number = 10;

	/** Interval (in seconds) for leader check in multi-main setup. */
	@Env('N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL')
	interval: number = 3;
}
