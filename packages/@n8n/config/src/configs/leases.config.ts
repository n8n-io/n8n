import { Config, Env } from '../decorators';

@Config
export class LeasesConfig {
	/**
	 * Whether main instances coordinate their work through leases stored in the database. Set to true to turn this on.
	 */
	@Env('N8N_LEASES_ENABLED')
	enabled: boolean = false;
}
