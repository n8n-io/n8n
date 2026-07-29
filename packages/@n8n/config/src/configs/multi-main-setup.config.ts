import { Config, Env } from '../decorators';

@Config
export class MultiMainSetupConfig {
	/** Whether to enable multi-main setup when using scaling mode (requires license). */
	@Env('N8N_MULTI_MAIN_SETUP_ENABLED')
	enabled: boolean = false;

	/** Time to live in seconds for the leader lock key; the current leader must renew before this expires. */
	@Env('N8N_MULTI_MAIN_SETUP_KEY_TTL')
	ttl: number = 10;

	/** Interval in seconds between leader eligibility checks in multi-main setup. */
	@Env('N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL')
	interval: number = 3;
}
