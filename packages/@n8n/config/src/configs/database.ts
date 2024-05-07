import { Config, FromEnv, Nested } from '../decorators';

@Config
class LoggingConfig {
	/** Typeorm logging enabled flag. @default false */
	@FromEnv('DB_LOGGING_ENABLED')
	readonly enabled: boolean = false;

	/**
	 * Logging level options, default is "error".
	 * Possible values: query,error,schema,warn,info,log.
	 * To enable all logging, specify "all"
	 * @default 'error'
	 */
	@FromEnv('DB_LOGGING_OPTIONS')
	readonly options: string = 'error';

	/**
	 * Maximum number of milliseconds query should be executed before logger logs a warning.
	 *
	 * Set 0 to disable long running query warning
	 * @default 0
	 */
	@FromEnv('DB_LOGGING_MAX_EXECUTION_TIME')
	readonly maxQueryExecutionTime: number = 0;
}

@Config
class PostgresSSLConfig {
	/**
	 * If SSL should be enabled.
	 * If `ca`, `cert`, or `key` are defined, this will automatically default to true
	 */
	@FromEnv('DB_POSTGRESDB_SSL_ENABLED')
	readonly enabled: boolean = false;

	/** SSL certificate authority */
	@FromEnv('DB_POSTGRESDB_SSL_CA')
	readonly ca: string = '';

	/** SSL certificate */
	@FromEnv('DB_POSTGRESDB_SSL_CERT')
	readonly cert: string = '';

	/** SSL key */
	@FromEnv('DB_POSTGRESDB_SSL_KEY')
	readonly key: string = '';

	/** If unauthorized SSL connections should be rejected. @default true */
	@FromEnv('DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED')
	readonly rejectUnauthorized: boolean = true;
}

@Config
class PostgresConfig {
	/** PostgresDB Database. @default 'n8n' */
	@FromEnv('DB_POSTGRESDB_DATABASE')
	database: string = 'n8n';

	/** PostgresDB Host. @default 'localhost' */
	@FromEnv('DB_POSTGRESDB_HOST')
	readonly host: string = 'localhost';

	/** PostgresDB Password */
	@FromEnv('DB_POSTGRESDB_PASSWORD')
	readonly password: string = '';

	/** PostgresDB Port. @default 5432 */
	@FromEnv('DB_POSTGRESDB_PORT')
	readonly port: number = 5432;

	/** PostgresDB User. @default 'postgres' */
	@FromEnv('DB_POSTGRESDB_USER')
	readonly user: string = 'postgres';

	/** PostgresDB Schema. @default 'public' */
	@FromEnv('DB_POSTGRESDB_SCHEMA')
	readonly schema: string = 'public';

	/** PostgresDB Pool Size. @default 2 */
	@FromEnv('DB_POSTGRESDB_POOL_SIZE')
	readonly poolSize = 2;

	@Nested
	readonly ssl: PostgresSSLConfig;
}

@Config
class MysqlConfig {
	/** @deprecated MySQL Database */
	@FromEnv('DB_MYSQLDB_DATABASE')
	database: string = 'n8n';

	/** MySQL Host. @default 'localhost' */
	@FromEnv('DB_MYSQLDB_HOST')
	readonly host: string = 'localhost';

	/** MySQL Password */
	@FromEnv('DB_MYSQLDB_PASSWORD')
	readonly password: string = '';

	/** MySQL Port. @default 3306 */
	@FromEnv('DB_MYSQLDB_PORT')
	readonly port: number = 3306;

	/** MySQL User. @default 'root' */
	@FromEnv('DB_MYSQLDB_USER')
	readonly user: string = 'root';
}

@Config
class SqliteConfig {
	/** SQLite Database file name. @default 'database.sqlite' */
	@FromEnv('DB_SQLITE_DATABASE')
	readonly database: string = 'database.sqlite';

	/** SQLite Pool Size (Setting this to 0 disables pooling). @default 0 */
	@FromEnv('DB_SQLITE_POOL_SIZE')
	readonly poolSize: number = 0;

	/**
	 * Enable SQLite WAL mode.
	 * @default true when poolSize > 1, otherwise false
	 */
	@FromEnv('DB_SQLITE_ENABLE_WAL')
	readonly enableWAL: boolean = this.poolSize > 1;

	/**
	 * Runs VACUUM operation on startup to rebuild the database.
	 * Reduces file=size and optimizes indexes.
	 *
	 * **WARNING**: This is a long running blocking operation. Will increase start-up time.
	 */
	@FromEnv('DB_SQLITE_VACUUM_ON_STARTUP')
	readonly executeVacuumOnStartup: boolean = false;
}

@Config
export class DatabaseConfig {
	/** Type of database to use. @default 'sqlite' */
	@FromEnv('DB_TYPE')
	type: 'sqlite' | 'mariadb' | 'mysqldb' | 'postgresdb' = 'sqlite';

	/** Prefix for table names */
	@FromEnv('DB_TABLE_PREFIX')
	readonly tablePrefix: string = '';

	@Nested
	readonly logging: LoggingConfig;

	@Nested
	readonly postgresdb: PostgresConfig;

	@Nested
	readonly mysqldb: MysqlConfig;

	@Nested
	readonly sqlite: SqliteConfig;
}
