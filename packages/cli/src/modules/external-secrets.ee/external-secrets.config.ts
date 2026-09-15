import { Config, Env } from '@n8n/config';
import { z } from 'zod';

// Seconds. The upper bound keeps the millisecond value inside Node's 32-bit timer range.
const timeoutSeconds = z.coerce.number().int().gte(1).lte(2_147_483);

@Config
export class ExternalSecretsConfig {
	/** How often (in seconds) to check for secret updates */
	@Env('N8N_EXTERNAL_SECRETS_UPDATE_INTERVAL')
	updateInterval: number = 300;

	/** How long (in seconds) to wait for a provider to connect before it is marked errored and retried in the background */
	@Env('N8N_EXTERNAL_SECRETS_CONNECT_TIMEOUT', timeoutSeconds)
	connectTimeout: number = 20;

	/** How long (in seconds) to wait for a provider to fetch its secrets before the refresh is abandoned */
	@Env('N8N_EXTERNAL_SECRETS_REFRESH_TIMEOUT', timeoutSeconds)
	refreshTimeout: number = 20;

	/** Whether to prefer GET over LIST when fetching secrets from Hashicorp Vault */
	@Env('N8N_EXTERNAL_SECRETS_PREFER_GET')
	preferGet: boolean = false;

	/** Whether to enable project-scoped external secrets */
	@Env('N8N_ENV_FEAT_EXTERNAL_SECRETS_FOR_PROJECTS')
	externalSecretsForProjects: boolean = true;

	/** Whether to enable multiple connections to global secret providers */
	@Env('N8N_ENV_FEAT_EXTERNAL_SECRETS_MULTIPLE_CONNECTIONS')
	externalSecretsMultipleConnections: boolean = true;

	/** Whether to enable role based access control to manage secret providers */
	@Env('N8N_ENV_FEAT_EXTERNAL_SECRETS_ROLE_BASED_ACCESS')
	externalSecretsRoleBasedAccess: boolean = true;
}
