import { Config, Nested } from './decorators';
import { CredentialsConfig } from './configs/credentials';
import { DatabaseConfig } from './configs/database';
import { EmailConfig } from './configs/email';
import { VersionNotificationsConfig } from './configs/version-notifications';
import { PublicApiConfig } from './configs/public-api';
import { ExternalSecretsConfig } from './configs/external-secrets';
import { TemplatesConfig } from './configs/templates';
import { EventBusConfig } from './configs/event-bus';

@Config
class UserManagementConfig {
	@Nested
	emails: EmailConfig;
}

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
}
