import { Config, Nested } from './decorators';
import { DatabaseConfig } from './configs/database';

@Config
export class GlobalConfig {
	@Nested
	database: DatabaseConfig;
}
