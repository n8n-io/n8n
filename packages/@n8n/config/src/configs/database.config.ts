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
	 * Database logging verbosity. Only applies when `DB_LOGGING_MAX_EXECUTION_TIME` is greater than 0.
	 */
	@Env('DB_LOGGING_OPTIONS', dbLoggingOptionsSchema)
	options: DbLoggingOptions = 'error';

	/** Only log queries that run longer than this many milliseconds. Set to 0 to disable slow-query logging. */
	@Env('DB_LOGGING_MAX_EXECUTION_TIME')
	maxQueryExecutionTime: number = 0;
}

@Config
class PostgresSSLConfig {
	/**
	 * Whether to use SSL/TLS for the Postgres connection.
	 * Defaults to true if any of the SSL cert/key/CA environment variables are set.
	 */
	@Env('DB_POSTGRESDB_SSL_ENABLED')
	enabled: boolean = false;

	/** Path or contents of the CA certificate for Postgres SSL. */
	@Env('DB_POSTGRESDB_SSL_CA')
	ca: string = '';

	/** Path or contents of the client certificate for Postgres SSL. */
	@Env('DB_POSTGRESDB_SSL_CERT')
	cert: string = '';

	/** Path or contents of the client private key for Postgres SSL. */
	@Env('DB_POSTGRESDB_SSL_KEY')
	key: string = '';

	/** Whether to reject Postgres connections when the server certificate cannot be verified. */
	@Env('DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED')
	rejectUnauthorized: boolean = true;
}

@Config
class PostgresConfig {
	/** Postgres database name. */
	@Env('DB_POSTGRESDB_DATABASE')
	database: string = 'n8n';

	/** Postgres database host. */
	@Env('DB_POSTGRESDB_HOST')
	host: string = 'localhost';

	/** Postgres database password. */
	@Env('DB_POSTGRESDB_PASSWORD')
	password: string = '';

	/** Postgres database port. */
	@Env('DB_POSTGRESDB_PORT')
	port: number = 5432;

	/** Postgres user name. */
	@Env('DB_POSTGRESDB_USER')
	user: string = 'postgres';

	/** Postgres schema to use. */
	@Env('DB_POSTGRESDB_SCHEMA')
	schema: string = 'public';

	/** Maximum number of connections in the Postgres connection pool. */
	@Env('DB_POSTGRESDB_POOL_SIZE')
	poolSize: number = 2;

	/** Timeout in milliseconds when establishing a new Postgres connection. */
	@Env('DB_POSTGRESDB_CONNECTION_TIMEOUT')
	connectionTimeoutMs: number = 20_000;

	/** Time in milliseconds after which an idle connection in the pool is closed. */
	@Env('DB_POSTGRESDB_IDLE_CONNECTION_TIMEOUT')
	idleTimeoutMs: number = 30_000;

	/** Maximum time in milliseconds for a single query. Queries exceeding this are cancelled. Set to 0 to disable. */
	@Env('DB_POSTGRESDB_STATEMENT_TIMEOUT')
	statementTimeoutMs: number = 5 * 60 * 1000; // 5 minutes

	@Nested
	ssl: PostgresSSLConfig;
}

const sqlitePoolSizeSchema = z.coerce.number().int().gte(1);

@Config
export class SqliteConfig {
	/** Path to the SQLite database file. */
	@Env('DB_SQLITE_DATABASE')
	database: string = 'database.sqlite';

	/** Number of connections in the SQLite connection pool. Must be at least 1. */
	@Env('DB_SQLITE_POOL_SIZE', sqlitePoolSizeSchema)
	poolSize: number = 3;

	/**
	 * Whether to run SQLite VACUUM on startup to reclaim space and optimize the file.
	 *
	 * @warning Blocking operation; can significantly increase startup time.
	 */
	@Env('DB_SQLITE_VACUUM_ON_STARTUP')
	executeVacuumOnStartup: boolean = false;
}

const dbTypeSchema = z.enum(['sqlite', 'postgresdb']);
type DbType = z.infer<typeof dbTypeSchema>;

@Config
export class DatabaseConfig {
	/** Database type: `sqlite` or `postgresdb`. */
	@Env('DB_TYPE', dbTypeSchema)
	type: DbType = 'sqlite';

	/** Prefix prepended to all n8n table names (useful for shared databases). */
	@Env('DB_TABLE_PREFIX')
	tablePrefix: string = '';

	/** Interval in seconds between health-check pings to the database. */
	@Env('DB_PING_INTERVAL_SECONDS')
	pingIntervalSeconds: number = 2;

	@Nested
	logging: LoggingConfig;

	@Nested
	postgresdb: PostgresConfig;

	@Nested
	sqlite: SqliteConfig;
}
