import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

// Timers take at most 2147483647 ms, so a value in seconds must stay below that once multiplied by 1000.
const leaseSecondsSchema = positiveIntSchema.max(2_147_483);

@Config
export class LeasesConfig {
	/**
	 * How long an instance holds a lease before it expires, in seconds. Use a whole number greater than zero. If an instance stops renewing its lease, another instance can take it over after this time.
	 */
	@Env('N8N_LEASES_LEASE_SECONDS', leaseSecondsSchema)
	leaseSeconds: number = 20;

	/**
	 * How often an instance renews the leases it holds, in seconds. Use a whole number greater than zero.
	 */
	@Env('N8N_LEASES_RENEW_SECONDS', leaseSecondsSchema)
	renewSeconds: number = 5;

	/**
	 * How long before a lease expires, in seconds, that an instance treats it as lost. Use a whole number greater than zero.
	 */
	@Env('N8N_LEASES_MARGIN_SECONDS', leaseSecondsSchema)
	marginSeconds: number = 5;
}
