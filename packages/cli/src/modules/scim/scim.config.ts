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

	// Pre-GA opt-in. IAM-1565 removes it at GA. Together with the `feat:scim`
	// license, this switch is the only gate (`scim-opt-in.ts`).
	/**
	 * Whether SCIM user provisioning is available on this instance before its
	 * general release. SCIM works only when this is true and your license
	 * includes SCIM. When false, the SCIM endpoints and settings aren't
	 * available.
	 */
	@Env('N8N_SCIM_OPT_IN')
	optIn: boolean = false;
}
