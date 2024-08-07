import { Config, Env, Nested } from './decorators';
import { CredentialsConfig } from './configs/credentials';
import { DatabaseConfig } from './configs/database';
import { EmailConfig } from './configs/email';
import { VersionNotificationsConfig } from './configs/version-notifications';
import { PublicApiConfig } from './configs/public-api';
import { ExternalSecretsConfig } from './configs/external-secrets';
import { TemplatesConfig } from './configs/templates';
import { EventBusConfig } from './configs/event-bus';
import { NodesConfig } from './configs/nodes';
import { ExternalStorageConfig } from './configs/external-storage';
import { WorkflowsConfig } from './configs/workflows';
import { EndpointsConfig } from './configs/endpoints';
import { CacheConfig } from './configs/cache';
import { ScalingModeConfig } from './configs/scaling-mode.config';

@Config
class UserManagementConfig {
	@Nested
	emails: EmailConfig;
}

@Config
export class GlobalConfig {
	@Nested
	readonly database: DatabaseConfig;

	@Nested
	readonly credentials: CredentialsConfig;

	@Nested
	readonly userManagement: UserManagementConfig;

	@Nested
	readonly versionNotifications: VersionNotificationsConfig;

	@Nested
	readonly publicApi: PublicApiConfig;

	@Nested
	readonly externalSecrets: ExternalSecretsConfig;

	@Nested
	readonly templates: TemplatesConfig;

	@Nested
	readonly eventBus: EventBusConfig;

	@Nested
	readonly nodes: NodesConfig;

	@Nested
	readonly externalStorage: ExternalStorageConfig;

	@Nested
	readonly workflows: WorkflowsConfig;

	/** Path n8n is deployed to */
	@Env('N8N_PATH')
	readonly path: string = '/';

	/** Host name n8n can be reached */
	@Env('N8N_HOST')
	readonly host: string = 'localhost';

	/** HTTP port n8n can be reached */
	@Env('N8N_PORT')
	readonly port: number = 5678;

	/** IP address n8n should listen on */
	@Env('N8N_LISTEN_ADDRESS')
	readonly listen_address: string = '0.0.0.0';

	/** HTTP Protocol via which n8n can be reached */
	@Env('N8N_PROTOCOL')
	readonly protocol: 'http' | 'https' = 'http';

	@Nested
	readonly endpoints: EndpointsConfig;

	@Nested
	readonly cache: CacheConfig;

	@Nested
	queue: ScalingModeConfig;
}
