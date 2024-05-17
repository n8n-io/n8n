import { Config, Env, Nested } from '../decorators';

@Config
class LoggingConfig {
	/** Typeorm logging enabled flag */
	@Env('DB_LOGGING_ENABLED')
	readonly enabled: boolean = false;

	/**
	 * Logging level options.
	 * Possible values: query,error,schema,warn,info,log.
	 * To enable all logging, specify "all"
	 */
	@Env('DB_LOGGING_OPTIONS')
	readonly options: 'query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'all' = 'error';

	/**
	 * Maximum number of milliseconds query should be executed before logger logs a warning.
	 *
	 * Set 0 to disable long running query warning
	 */
	@Env('DB_LOGGING_MAX_EXECUTION_TIME')
	readonly maxQueryExecutionTime: number = 0;
}

@Config
class PostgresSSLConfig {
	/**
	 * If SSL should be enabled.
	 * If `ca`, `cert`, or `key` are defined, this will automatically default to true
	 */
	@Env('DB_POSTGRESDB_SSL_ENABLED')
	readonly enabled: boolean = false;

	/** SSL certificate authority */
	@Env('DB_POSTGRESDB_SSL_CA')
	readonly ca: string = '';

	/** SSL certificate */
	@Env('DB_POSTGRESDB_SSL_CERT')
	readonly cert: string = '';

	/** SSL key */
	@Env('DB_POSTGRESDB_SSL_KEY')
	readonly key: string = '';

	/** If unauthorized SSL connections should be rejected */
	@Env('DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED')
	readonly rejectUnauthorized: boolean = true;
}

@Config
class PostgresConfig {
	/** PostgresDB Database */
	@Env('DB_POSTGRESDB_DATABASE')
	database: string = 'n8n';

	/** PostgresDB Host */
	@Env('DB_POSTGRESDB_HOST')
	readonly host: string = 'localhost';

	/** PostgresDB Password */
	@Env('DB_POSTGRESDB_PASSWORD')
	readonly password: string = '';

	/** PostgresDB Port */
	@Env('DB_POSTGRESDB_PORT')
	readonly port: number = 5432;

	/** PostgresDB User */
	@Env('DB_POSTGRESDB_USER')
	readonly user: string = 'postgres';

	/** PostgresDB Schema */
	@Env('DB_POSTGRESDB_SCHEMA')
	readonly schema: string = 'public';

	/** PostgresDB Pool Size */
	@Env('DB_POSTGRESDB_POOL_SIZE')
	readonly poolSize = 2;

	@Nested
	readonly ssl: PostgresSSLConfig;
}

@Config
class MysqlConfig {
	/** @deprecated MySQL Database */
	@Env('DB_MYSQLDB_DATABASE')
	database: string = 'n8n';

	/** MySQL Host */
	@Env('DB_MYSQLDB_HOST')
	readonly host: string = 'localhost';

	/** MySQL Password */
	@Env('DB_MYSQLDB_PASSWORD')
	readonly password: string = '';

	/** MySQL Port */
	@Env('DB_MYSQLDB_PORT')
	readonly port: number = 3306;

	/** MySQL User */
	@Env('DB_MYSQLDB_USER')
	readonly user: string = 'root';
}

@Config
class SqliteConfig {
	/** SQLite Database file name */
	@Env('DB_SQLITE_DATABASE')
	readonly database: string = 'database.sqlite';

	/** SQLite Pool Size (Setting this to 0 disables pooling) */
	@Env('DB_SQLITE_POOL_SIZE')
	readonly poolSize: number = 0;

	/**
	 * Enable SQLite WAL mode.
	 */
	@Env('DB_SQLITE_ENABLE_WAL')
	readonly enableWAL: boolean = this.poolSize > 1;

	/**
	 * Runs VACUUM operation on startup to rebuild the database.
	 * Reduces file=size and optimizes indexes.
	 *
	 * **WARNING**: This is a long running blocking operation. Will increase start-up time.
	 */
	@Env('DB_SQLITE_VACUUM_ON_STARTUP')
	readonly executeVacuumOnStartup: boolean = false;
}

@Config
export class DatabaseConfig {
	/** Type of database to use */
	@Env('DB_TYPE')
	type: 'sqlite' | 'mariadb' | 'mysqldb' | 'postgresdb' = 'sqlite';

	/** Prefix for table names */
	@Env('DB_TABLE_PREFIX')
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
