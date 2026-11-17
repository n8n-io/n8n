import { Config, Env } from '../decorators';

@Config
export class LeasesConfig {
	/**
	 * Experimental: Whether n8n instances coordinate their work through leases stored in the database. Set to true to turn this on.
	 */
	@Env('N8N_LEASES_ENABLED')
	enabled: boolean = false;
}
