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

	/**
	 * Whether the identity provider may assign n8n roles via the SCIM
	 * `roles` attribute. Off by default: while it is off, incoming role data
	 * is ignored and provisioned users keep the default member role.
	 */
	@Env('N8N_SCIM_ROLE_PROVISIONING_ENABLED')
	roleProvisioningEnabled: boolean = false;
}
