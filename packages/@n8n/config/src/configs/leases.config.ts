import { Config, Env } from '../decorators';

@Config
export class LeasesConfig {
	/**
	 * Whether the lease service runs on main instances. Set to true to turn it on.
	 */
	@Env('N8N_LEASES_ENABLED')
	enabled: boolean = false;
}
