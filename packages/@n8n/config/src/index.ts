import { Config, Nested } from './decorators';
import { CredentialsConfig } from './configs/credentials';
import { DatabaseConfig } from './configs/database';
import { EmailConfig } from './configs/email';
import { PublicApiConfig } from './configs/public-api';

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
	publicApi: PublicApiConfig;
}
