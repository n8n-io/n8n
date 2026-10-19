import { Config, Env } from '@n8n/config';
import { z } from 'zod';

/** Configuration for the SCIM provisioning module. */
@Config
export class ScimConfig {
	/**
	 * Maximum number of requests to the SCIM endpoints (`/scim/v2/*`) per IP
	 * per 5 minutes. The default is sized to accommodate an identity
	 * provider's initial full sync. Set to `0` to disable IP rate limiting.
	 */
	@Env('N8N_SCIM_RATE_LIMIT', z.number({ coerce: true }).int().nonnegative())
	rateLimit: number = 600;

	// Pre-GA opt-in. IAM-1565 removes it at GA. `ScimOptInService` also accepts
	// the instance PostHog flag, so this switch can only force the opt-in on.
	/**
	 * Whether SCIM provisioning is available on this instance before its general
	 * release. Set to true to turn on the SCIM endpoints and settings on an
	 * instance with a license that includes SCIM. When false, SCIM is available
	 * only if n8n turned it on for your instance as part of a staged rollout.
	 */
	@Env('N8N_SCIM_OPT_IN')
	optIn: boolean = false;
}
