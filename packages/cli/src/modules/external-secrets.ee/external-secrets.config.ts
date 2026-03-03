import { Config, Env } from '@n8n/config';

@Config
export class ExternalSecretsConfig {
	/** How often (in seconds) to check for secret updates */
	@Env('N8N_EXTERNAL_SECRETS_UPDATE_INTERVAL')
	updateInterval: number = 300;

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
	externalSecretsRoleBasedAccess: boolean = false;
}
