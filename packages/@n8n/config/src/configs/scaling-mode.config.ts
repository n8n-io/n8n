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
class RedisConfig {
	/** Redis database for Bull queue. */
	@Env('QUEUE_BULL_REDIS_DB')
	db: number = 0;

	/** Redis host for Bull queue. */
	@Env('QUEUE_BULL_REDIS_HOST')
	host: string = 'localhost';

	/** Password to authenticate with Redis. */
	@Env('QUEUE_BULL_REDIS_PASSWORD')
	password: string = '';

	/** Port for Redis to listen on. */
	@Env('QUEUE_BULL_REDIS_PORT')
	port: number = 6379;

	/** Max cumulative timeout (in milliseconds) of connection retries before process exit. */
	@Env('QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD')
	timeoutThreshold: number = 10_000;

	/** Slot refresh timeout (in milliseconds) before a timeout occurs while refreshing slots from the cluster. */
	@Env('QUEUE_BULL_REDIS_SLOT_REFRESH_TIMEOUT')
	slotsRefreshTimeout: number = 1_000;
	/** Slot refresh interval (in milliseconds) between every automatic slot refresh. */
	@Env('QUEUE_BULL_REDIS_SLOT_REFRESH_INTERVAL')
	slotsRefreshInterval: number = 5_000;

	/** Redis username. Redis 6.0 or higher required. */
	@Env('QUEUE_BULL_REDIS_USERNAME')
	username: string = '';

	/** Redis cluster startup nodes, as comma-separated list of `{host}:{port}` pairs. @example 'redis-1:6379,redis-2:6379' */
	@Env('QUEUE_BULL_REDIS_CLUSTER_NODES')
	clusterNodes: string = '';

	/** Whether to enable TLS on Redis connections. */
	@Env('QUEUE_BULL_REDIS_TLS')
	tls: boolean = false;

	/**
	 * DNS resolution strategy for Redis hostnames on initial client connection.
	 * - `LOOKUP` (default): Use system DNS resolver to resolve hostnames to IP addresses.
	 * - `NONE`: Disable DNS resolution and pass hostnames directly to Redis client.
	 *
	 * DNS lookups can be error prone, especially in combination with TLS certificates.
	 * Especially AWS Elasticache cluster connections often lead to invalid certificate errors due to hostname/ip mismatches.
	 * For AWS ElastiCache clusters with TLS, it is recommended to set this option to `NONE`.
	 * @see https://github.com/redis/ioredis?tab=readme-ov-file#special-note-aws-elasticache-clusters-with-tls
	 */
	@Env('QUEUE_BULL_REDIS_DNS_LOOKUP_STRATEGY')
	dnsResolveStrategy: 'LOOKUP' | 'NONE' = 'LOOKUP';

	/** Whether to enable dual-stack hostname resolution for Redis connections. */
	@Env('QUEUE_BULL_REDIS_DUALSTACK')
	dualStack: boolean = false;

	/** Whether to enable TCP keep-alive on Redis connections. */
	@Env('QUEUE_BULL_REDIS_KEEP_ALIVE')
	keepAlive: boolean = false;

	/** TCP keep-alive initial delay in milliseconds. */
	@Env('QUEUE_BULL_REDIS_KEEP_ALIVE_DELAY')
	keepAliveDelay: number = 5000;

	/** TCP keep-alive interval in milliseconds. */
	@Env('QUEUE_BULL_REDIS_KEEP_ALIVE_INTERVAL')
	keepAliveInterval: number = 5000;

	/** Whether to reconnect to Redis on READONLY errors i.e., failover events. */
	@Env('QUEUE_BULL_REDIS_RECONNECT_ON_FAILOVER')
	reconnectOnFailover: boolean = true;
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
