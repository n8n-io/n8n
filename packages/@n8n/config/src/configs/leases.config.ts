import { Config, Env } from '../decorators';

@Config
export class LeasesConfig {
	/**
	 * How long an instance holds a lease before it expires, in seconds. Use a whole number. If an instance stops renewing its lease, another instance can take it over after this time.
	 */
	@Env('N8N_LEASES_LEASE_SECONDS')
	leaseSeconds: number = 20;

	/**
	 * How often an instance renews the leases it holds, in seconds. Use a whole number.
	 */
	@Env('N8N_LEASES_RENEW_SECONDS')
	renewSeconds: number = 5;

	/**
	 * How long before a lease expires, in seconds, that an instance treats it as lost. Use a whole number.
	 */
	@Env('N8N_LEASES_MARGIN_SECONDS')
	marginSeconds: number = 5;
}
