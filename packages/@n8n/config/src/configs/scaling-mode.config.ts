import { Config, Env, Nested } from '../decorators';

@Config
class HealthConfig {
	/**
	 * Whether to enable the worker health check endpoints:
	 * - `/healthz` (worker alive)
	 * - `/healthz/readiness` (worker connected to migrated database and connected to Redis)
	 */
	@Env('QUEUE_HEALTH_CHECK_ACTIVE')
	active: boolean = false;

	/** Port for worker server to listen on. */
	@Env('QUEUE_HEALTH_CHECK_PORT')
	port: number = 5678;

	/** IP address for worker server to listen on. */
	@Env('N8N_WORKER_SERVER_ADDRESS')
	address: string = '::';
}

@Config
class RedisTlsConfig {
	/**
	 * Redis TLS options matches nodejs tls ConnectionOptions.
	 * https://bun.com/reference/node/tls/ConnectionOptions
	 */

	/** Root CA certificate file path. Must be PEM formatted X.509 certificate. @example '/home/node/certs/ca.crt' */
	@Env('QUEUE_BULL_REDIS_TLS_CA_FILE')
	caFile: string = '';

	/** Client certificate in pem format. Must be PEM formatted X.509 certificate. Optional if redis tls_auth_clients is 'no' or 'optional'. @example '/home/node/certs/cert.crt' */
	@Env('QUEUE_BULL_REDIS_TLS_CERT_FILE')
	certFile: string = '';

	/** The client certificate's private key. File path to load pem certificate file. @example '/home/node/certs/cert.key' */
	@Env('QUEUE_BULL_REDIS_TLS_CERT_KEY_FILE')
	certKeyFile: string = '';

	/** The passphrase to decrypt the client certificate's private key. . @example 'MyCertKeyPassphrase' */
	@Env('QUEUE_BULL_REDIS_TLS_CERT_KEY_PASS')
	certKeyFilePassphrase: string = '';

	/** SNI extension servername for TLS handshake. */
	@Env('QUEUE_BULL_REDIS_TLS_SERVERNAME')
	serverName: string = '';

	/** If unauthorized SSL connections should be rejected */
	@Env('QUEUE_BULL_REDIS_TLS_REJECT_UNAUTHORIZED')
	rejectUnauthorized: boolean = true;
}

@Config
class RedisConfig {
	/** Redis database for Bull queue. */
	@Env('QUEUE_BULL_REDIS_DB')
	db: number = 0;

	/** Redis host for Bull queue. */
	@Env('QUEUE_BULL_REDIS_HOST')
	host: string = 'localhost';

	/** Enable full ioredis client debug logging. Same as setting env 'DEBUG=ioredis:*' */
	@Env('QUEUE_BULL_REDIS_DEBUG')
	debug: boolean = false;

	/** Password to authenticate with Redis. */
	@Env('QUEUE_BULL_REDIS_PASSWORD')
	password: string = '';

	/** Port for Redis to listen on. */
	@Env('QUEUE_BULL_REDIS_PORT')
	port: number = 6379;

	/** Max cumulative timeout (in milliseconds) of connection retries before process exit. */
	@Env('QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD')
	timeoutThreshold: number = 10_000;

	/** Redis username. Redis 6.0 or higher required. */
	@Env('QUEUE_BULL_REDIS_USERNAME')
	username: string = '';

	/** Redis cluster startup nodes, as comma-separated list of `{host}:{port}` pairs. @example 'redis-1:6379,redis-2:6379' */
	@Env('QUEUE_BULL_REDIS_CLUSTER_NODES')
	clusterNodes: string = '';

	/** Whether to enable TLS on Redis connections. */
	@Env('QUEUE_BULL_REDIS_TLS')
	tls: boolean = false;

	@Nested
	tlsConfig: RedisTlsConfig;

	/** Whether to enable dual-stack hostname resolution to support both IPv4 and IPv6 addresses for Redis connections. Default uses IPv4 only. */
	@Env('QUEUE_BULL_REDIS_DUALSTACK')
	dualStack: boolean = false;

	/** Whether to use only IPv6 to avoid ENOTFOUND errors when a hostname only resolves to an IPv6 address . Default uses IPv4 only. */
	@Env('QUEUE_BULL_REDIS_IPV6')
	ipV6: boolean = false;

	/**
	 * In auto pipelining mode, all commands issued during an event loop are enqueued in a pipeline automatically managed by ioredis.
	 * At the end of the iteration, the pipeline is executed and thus all commands are sent to the server at the same time.
	 * This feature can dramatically improve throughput and avoids HOL blocking.
	 * @see https://github.com/redis/ioredis?tab=readme-ov-file#autopipelining
	 */
	@Env('QUEUE_BULL_REDIS_ENABLE_AUTO_PIPELINING')
	enableAutoPipelining: boolean = false;
}

@Config
class SettingsConfig {
	/** How long (in milliseconds) is the lease period for a worker processing a job. */
	@Env('QUEUE_WORKER_LOCK_DURATION')
	lockDuration: number = 60_000;

	/** How often (in milliseconds) a worker must renew the lease. */
	@Env('QUEUE_WORKER_LOCK_RENEW_TIME')
	lockRenewTime: number = 10_000;

	/** How often (in milliseconds) Bull must check for stalled jobs. `0` to disable. */
	@Env('QUEUE_WORKER_STALLED_INTERVAL')
	stalledInterval: number = 30_000;
}

@Config
class BullConfig {
	/** Prefix for Bull keys on Redis. @example 'bull:jobs:23' */
	@Env('QUEUE_BULL_PREFIX')
	prefix: string = 'bull';

	@Nested
	redis: RedisConfig;

	/** @deprecated How long (in seconds) a worker must wait for active executions to finish before exiting. Use `N8N_GRACEFUL_SHUTDOWN_TIMEOUT` instead */
	@Env('QUEUE_WORKER_TIMEOUT')
	gracefulShutdownTimeout: number = 30;

	@Nested
	settings: SettingsConfig;
}

@Config
export class ScalingModeConfig {
	@Nested
	health: HealthConfig;

	@Nested
	bull: BullConfig;
}
