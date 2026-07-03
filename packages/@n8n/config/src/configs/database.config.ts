import { Time } from '@n8n/constants';
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
	statementTimeoutMs: number = 5 * Time.minutes.toMilliseconds;

	/** Maximum lifetime in milliseconds of a pooled Postgres connection before it is recycled. Set to 0 to disable. */
	@Env('DB_POSTGRESDB_MAX_CONNECTION_LIFETIME_MS')
	maxConnectionLifetimeMs: number = 1 * Time.hours.toMilliseconds;

	/** Whether to enable TCP keepalive on Postgres connections so dead peers are detected without waiting for a query. */
	@Env('DB_POSTGRESDB_KEEP_ALIVE')
	keepAlive: boolean = true;

	/** Initial delay in milliseconds before the first TCP keepalive probe is sent. */
	@Env('DB_POSTGRESDB_KEEP_ALIVE_INITIAL_DELAY_MS')
	keepAliveInitialDelayMs: number = 10_000;

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

const DEFAULT_PING_TIMEOUT_MS = 5_000;

function readLegacyPingTimeoutMs(): number {
	const raw = process.env.N8N_DB_PING_TIMEOUT;
	if (!raw) {
		return DEFAULT_PING_TIMEOUT_MS;
	}
	const parsed = Number.parseInt(raw, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		console.warn(
			`Invalid N8N_DB_PING_TIMEOUT="${raw}", falling back to ${DEFAULT_PING_TIMEOUT_MS}ms. Prefer the supported DB_PING_TIMEOUT_MS env var.`,
		);
		return DEFAULT_PING_TIMEOUT_MS;
	}
	return parsed;
}

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

	/**
	 * Timeout in milliseconds for an individual database health-check ping.
	 *
	 * Falls back to the legacy `N8N_DB_PING_TIMEOUT` env var if set. The legacy
	 * name is deprecated and may be removed in a future release.
	 */
	@Env('DB_PING_TIMEOUT_MS')
	pingTimeoutMs: number = readLegacyPingTimeoutMs();

	/**
	 * How many consecutive health-check ping failures must occur before the
	 * connection is considered lost and the DataSource is torn down and
	 * reinitialized (full pool recovery).
	 *
	 * Recovery is disruptive (it destroys and recreates the connection pool),
	 * so this guards against a single transient blip triggering it. With the
	 * default `DB_PING_INTERVAL_SECONDS=2`, the default of 3 means recovery
	 * fires only after roughly 6s of sustained ping failures.
	 *
	 * Raise this if you see recovery triggering on brief network hiccups
	 * (false positives); lower it to react faster to genuinely dead connections.
	 *
	 * Must be >= 1: recovery fires only after at least one failed ping.
	 */
	@Env('DB_PING_MAX_FAILURES_BEFORE_RECOVERY', z.coerce.number().int().gte(1))
	pingMaxFailuresBeforeRecovery: number = 3;

	/**
	 * Initial delay in milliseconds before retrying a failed recovery attempt.
	 *
	 * Recovery retries use exponential backoff: each failed attempt waits
	 * `min(minRecoveryBackoffMs * 2 ** (attempt - 1), maxRecoveryBackoffMs)`.
	 * This is the delay after the first failed attempt (the floor of the curve).
	 *
	 * Must be >= 1
	 */
	@Env('DB_RECOVERY_BACKOFF_MIN_MS', z.coerce.number().int().gte(1))
	minRecoveryBackoffMs: number = 1 * Time.seconds.toMilliseconds;

	/**
	 * Maximum delay in milliseconds between recovery attempts.
	 *
	 * Caps the exponential backoff so retries never wait longer than this,
	 * keeping recovery responsive once the database becomes reachable again.
	 * Must be greater than or equal to `DB_RECOVERY_BACKOFF_MIN_MS`.
	 *
	 * Must be >= 1
	 */
	@Env('DB_RECOVERY_BACKOFF_MAX_MS', z.coerce.number().int().gte(1))
	maxRecoveryBackoffMs: number = 30 * Time.seconds.toMilliseconds;

	/**
	 * Maximum time in milliseconds a query waits for an in-progress connection
	 * recovery before failing fast.
	 *
	 * While recovery rebuilds the pool, every query that needs a connection parks
	 * until recovery completes. During a short blip that wait is invisible and the
	 * query succeeds against the fresh pool. During a long outage it would
	 * otherwise pile up parked queries for the whole outage, so this bounds the
	 * wait: once it elapses the query rejects with an `OperationalError` instead of
	 * holding the request open indefinitely. The default (30s) comfortably covers
	 * common-case recoveries while staying within typical HTTP gateway timeouts.
	 *
	 * Set to `0` to wait indefinitely (no timeout).
	 */
	@Env('DB_CONNECTION_ACQUISITION_TIMEOUT_MS', z.coerce.number().int().gte(0))
	connectionAcquisitionTimeoutMs: number = 30 * Time.seconds.toMilliseconds;

	@Nested
	logging: LoggingConfig;

	@Nested
	postgresdb: PostgresConfig;

	@Nested
	sqlite: SqliteConfig;
}
