import { Config, Nested } from './decorators';
import { DatabaseConfig } from './configs/database';
import { CredentialsConfig } from './configs/credentials';

@Config
export class GlobalConfig {
	@Nested
	database: DatabaseConfig;

	@Nested
	credentials: CredentialsConfig;
}
