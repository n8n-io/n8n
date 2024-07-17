import { Config, Nested } from './decorators';
import { CredentialsConfig } from './configs/credentials';
import { DatabaseConfig } from './configs/database';
import { EmailConfig } from './configs/email';
import { VersionNotificationsConfig } from './configs/version-notifications';

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
}
