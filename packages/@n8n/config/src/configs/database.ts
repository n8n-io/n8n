import { Config, Env, Nested } from '../decorators';

@Config
class LoggingConfig {
	/** Whether database logging is enabled. */
	@Env('DB_LOGGING_ENABLED')
	readonly enabled: boolean = false;

	/**
	 * Database logging level. Requires `DB_LOGGING_MAX_EXECUTION_TIME` to be higher than `0`.
	 */
	@Env('DB_LOGGING_OPTIONS')
	readonly options: 'query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'all' = 'error';

	/**
	 * Only queries that exceed this time (ms) will be logged. Set `0` to disable.
	 */
	@Env('DB_LOGGING_MAX_EXECUTION_TIME')
	readonly maxQueryExecutionTime: number = 0;
}

@Config
class PostgresSSLConfig {
	/**
	 * Whether to enable SSL.
	 * If `DB_POSTGRESDB_SSL_CA`, `DB_POSTGRESDB_SSL_CERT`, or `DB_POSTGRESDB_SSL_KEY` are defined, `DB_POSTGRESDB_SSL_ENABLED` defaults to `true`.
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
	/** Postgres database name */
	@Env('DB_POSTGRESDB_DATABASE')
	database: string = 'n8n';

	/** Postgres database host */
	@Env('DB_POSTGRESDB_HOST')
	readonly host: string = 'localhost';

	/** Postgres database password */
	@Env('DB_POSTGRESDB_PASSWORD')
	readonly password: string = '';

	/** Postgres database port */
	@Env('DB_POSTGRESDB_PORT')
	readonly port: number = 5432;

	/** Postgres database user */
	@Env('DB_POSTGRESDB_USER')
	readonly user: string = 'postgres';

	/** Postgres database schema */
	@Env('DB_POSTGRESDB_SCHEMA')
	readonly schema: string = 'public';

	/** Postgres database pool size */
	@Env('DB_POSTGRESDB_POOL_SIZE')
	readonly poolSize = 2;

	@Nested
	readonly ssl: PostgresSSLConfig;
}

@Config
class MysqlConfig {
	/** @deprecated MySQL database name */
	@Env('DB_MYSQLDB_DATABASE')
	database: string = 'n8n';

	/** MySQL database host */
	@Env('DB_MYSQLDB_HOST')
	readonly host: string = 'localhost';

	/** MySQL database password */
	@Env('DB_MYSQLDB_PASSWORD')
	readonly password: string = '';

	/** MySQL database port */
	@Env('DB_MYSQLDB_PORT')
	readonly port: number = 3306;

	/** MySQL database user */
	@Env('DB_MYSQLDB_USER')
	readonly user: string = 'root';
}

@Config
class SqliteConfig {
	/** SQLite database file name */
	@Env('DB_SQLITE_DATABASE')
	readonly database: string = 'database.sqlite';

	/** SQLite database pool size. Set to `0` to disable pooling. */
	@Env('DB_SQLITE_POOL_SIZE')
	readonly poolSize: number = 0;

	/**
	 * Enable SQLite WAL mode.
	 */
	@Env('DB_SQLITE_ENABLE_WAL')
	readonly enableWAL: boolean = this.poolSize > 1;

	/**
	 * Run `VACUUM` on startup to rebuild the database, reducing file size and optimizing indexes.
	 *
	 * @warning Long-running blocking operation that will increase startup time.
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
