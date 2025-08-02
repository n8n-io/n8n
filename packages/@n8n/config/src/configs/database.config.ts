import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const dbLoggingOptionsSchema = z.enum(['query', 'error', 'schema', 'warn', 'info', 'log', 'all']);
type DbLoggingOptions = z.infer<typeof dbLoggingOptionsSchema>;

@Config
class LoggingConfig {
	/** Whether database logging is enabled. */
	@Env('DB_LOGGING_ENABLED')
	enabled: boolean = false;

	/**
	 * Database logging level. Requires `DB_LOGGING_MAX_EXECUTION_TIME` to be higher than `0`.
	 */
	@Env('DB_LOGGING_OPTIONS', dbLoggingOptionsSchema)
	options: DbLoggingOptions = 'error';

	/**
	 * Only queries that exceed this time (ms) will be logged. Set `0` to disable.
	 */
	@Env('DB_LOGGING_MAX_EXECUTION_TIME')
	maxQueryExecutionTime: number = 0;
}

@Config
class PostgresSSLConfig {
	/**
	 * Whether to enable SSL.
	 * If `DB_POSTGRESDB_SSL_CA`, `DB_POSTGRESDB_SSL_CERT`, or `DB_POSTGRESDB_SSL_KEY` are defined, `DB_POSTGRESDB_SSL_ENABLED` defaults to `true`.
	 */
	@Env('DB_POSTGRESDB_SSL_ENABLED')
	enabled: boolean = false;

	/** SSL certificate authority */
	@Env('DB_POSTGRESDB_SSL_CA')
	ca: string = '';

	/** SSL certificate */
	@Env('DB_POSTGRESDB_SSL_CERT')
	cert: string = '';

	/** SSL key */
	@Env('DB_POSTGRESDB_SSL_KEY')
	key: string = '';

	/** If unauthorized SSL connections should be rejected */
	@Env('DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED')
	rejectUnauthorized: boolean = true;
}

@Config
class PostgresConfig {
	/** Postgres database name */
	@Env('DB_POSTGRESDB_DATABASE')
	database: string = 'n8n';

	/** Postgres database host */
	@Env('DB_POSTGRESDB_HOST')
	host: string = 'localhost';

	/** Postgres database password */
	@Env('DB_POSTGRESDB_PASSWORD')
	password: string = '';

	/** Postgres database port */
	@Env('DB_POSTGRESDB_PORT')
	port: number = 5432;

	/** Postgres database user */
	@Env('DB_POSTGRESDB_USER')
	user: string = 'postgres';

	/** Postgres database schema */
	@Env('DB_POSTGRESDB_SCHEMA')
	schema: string = 'public';

	/** Postgres database pool size */
	@Env('DB_POSTGRESDB_POOL_SIZE')
	poolSize: number = 2;

	/** Postgres connection timeout (ms) */
	@Env('DB_POSTGRESDB_CONNECTION_TIMEOUT')
	connectionTimeoutMs: number = 20_000;

	/** Postgres idle connection timeout (ms) */
	@Env('DB_POSTGRESDB_IDLE_CONNECTION_TIMEOUT')
	idleTimeoutMs: number = 30_000;

	@Nested
	ssl: PostgresSSLConfig;
}

@Config
class MysqlConfig {
	/** @deprecated MySQL database name */
	@Env('DB_MYSQLDB_DATABASE')
	database: string = 'n8n';

	/** MySQL database host */
	@Env('DB_MYSQLDB_HOST')
	host: string = 'localhost';

	/** MySQL database password */
	@Env('DB_MYSQLDB_PASSWORD')
	password: string = '';

	/** MySQL database port */
	@Env('DB_MYSQLDB_PORT')
	port: number = 3306;

	/** MySQL database user */
	@Env('DB_MYSQLDB_USER')
	user: string = 'root';
}

@Config
export class SqliteConfig {
	/** SQLite database file name */
	@Env('DB_SQLITE_DATABASE')
	database: string = 'database.sqlite';

	/** SQLite database pool size. Set to `0` to disable pooling. */
	@Env('DB_SQLITE_POOL_SIZE')
	poolSize: number = 0;

	/**
	 * Enable SQLite WAL mode.
	 */
	@Env('DB_SQLITE_ENABLE_WAL')
	enableWAL: boolean = this.poolSize > 1;

	/**
	 * Run `VACUUM` on startup to rebuild the database, reducing file size and optimizing indexes.
	 *
	 * @warning Long-running blocking operation that will increase startup time.
	 */
	@Env('DB_SQLITE_VACUUM_ON_STARTUP')
	executeVacuumOnStartup: boolean = false;
}

const dbTypeSchema = z.enum(['sqlite', 'mariadb', 'mysqldb', 'postgresdb']);
type DbType = z.infer<typeof dbTypeSchema>;

@Config
export class DatabaseConfig {
	/** Type of database to use */
	@Env('DB_TYPE', dbTypeSchema)
	type: DbType = 'sqlite';

	/**
	 * Is true if the default sqlite data source of TypeORM is used, as opposed
	 * to any other (e.g. postgres)
	 * This also returns false if n8n's new pooled sqlite data source is used.
	 */
	get isLegacySqlite() {
		return this.type === 'sqlite' && this.sqlite.poolSize === 0;
	}

	/** Prefix for table names */
	@Env('DB_TABLE_PREFIX')
	tablePrefix: string = '';

	/**
	 * The interval in seconds to ping the database to check if the connection is still alive.
	 */
	@Env('DB_PING_INTERVAL_SECONDS')
	pingIntervalSeconds: number = 2;

	@Nested
	logging: LoggingConfig;

	@Nested
	postgresdb: PostgresConfig;

	@Nested
	mysqldb: MysqlConfig;

	@Nested
	sqlite: SqliteConfig;
}
