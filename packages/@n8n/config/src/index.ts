import { Config, Nested } from './decorators';
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
}
