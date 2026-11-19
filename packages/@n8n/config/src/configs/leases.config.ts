import { Config, Env } from '../decorators';

@Config
export class LeasesConfig {
	/**
	 * How long a main instance holds a lease before it expires, in seconds. Use a whole number. If an instance stops renewing its lease, another main instance can take it over after this time.
	 */
	@Env('N8N_LEASES_LEASE_SECONDS')
	leaseSeconds: number = 20;

	/**
	 * How often a main instance renews the leases it holds, in seconds. Use a whole number.
	 */
	@Env('N8N_LEASES_RENEW_SECONDS')
	renewSeconds: number = 5;

	/**
	 * How long before a lease expires, in seconds, that a main instance treats it as lost. Use a whole number.
	 */
	@Env('N8N_LEASES_MARGIN_SECONDS')
	marginSeconds: number = 5;
}
