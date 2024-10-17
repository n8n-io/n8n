import { CacheConfig } from './configs/cache.config';
import { CredentialsConfig } from './configs/credentials.config';
import { DatabaseConfig } from './configs/database.config';
import { EndpointsConfig } from './configs/endpoints.config';
import { EventBusConfig } from './configs/event-bus.config';
import { ExternalSecretsConfig } from './configs/external-secrets.config';
import { ExternalStorageConfig } from './configs/external-storage.config';
import { LoggingConfig } from './configs/logging.config';
import { MultiMainSetupConfig } from './configs/multi-main-setup.config';
import { NodesConfig } from './configs/nodes.config';
import { PublicApiConfig } from './configs/public-api.config';
import { TaskRunnersConfig } from './configs/runners.config';
export { TaskRunnersConfig } from './configs/runners.config';
import { ScalingModeConfig } from './configs/scaling-mode.config';
import { SentryConfig } from './configs/sentry.config';
import { TemplatesConfig } from './configs/templates.config';
import { UserManagementConfig } from './configs/user-management.config';
import { VersionNotificationsConfig } from './configs/version-notifications.config';
import { WorkflowsConfig } from './configs/workflows.config';
import { Config, Env, Nested } from './decorators';

export { LOG_SCOPES } from './configs/logging.config';
export type { LogScope } from './configs/logging.config';

@Config
export class GlobalConfig {
	@Nested
	database: DatabaseConfig;

	@Nested
	credentials: CredentialsConfig;

	@Nested
	userManagement: UserManagementConfig;

	@Nested
	versionNotifications: VersionNotificationsConfig;

	@Nested
	publicApi: PublicApiConfig;

	@Nested
	externalSecrets: ExternalSecretsConfig;

	@Nested
	templates: TemplatesConfig;

	@Nested
	eventBus: EventBusConfig;

	@Nested
	nodes: NodesConfig;

	@Nested
	externalStorage: ExternalStorageConfig;

	@Nested
	workflows: WorkflowsConfig;

	@Nested
	sentry: SentryConfig;

	/** Path n8n is deployed to */
	@Env('N8N_PATH')
	path: string = '/';

	/** Host name n8n can be reached */
	@Env('N8N_HOST')
	host: string = 'localhost';

	/** HTTP port n8n can be reached */
	@Env('N8N_PORT')
	port: number = 5678;

	/** IP address n8n should listen on */
	@Env('N8N_LISTEN_ADDRESS')
	listen_address: string = '0.0.0.0';

	/** HTTP Protocol via which n8n can be reached */
	@Env('N8N_PROTOCOL')
	protocol: 'http' | 'https' = 'http';

	@Nested
	endpoints: EndpointsConfig;

	@Nested
	cache: CacheConfig;

	@Nested
	queue: ScalingModeConfig;

	@Nested
	logging: LoggingConfig;

	@Nested
	taskRunners: TaskRunnersConfig;

	@Nested
	multiMainSetup: MultiMainSetupConfig;
}
