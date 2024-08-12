import { Config, Env, Nested } from '../decorators';

@Config
class HealthConfig {
	/** Whether to enable the worker health check endpoint `/healthz`. */
	@Env('QUEUE_HEALTH_CHECK_ACTIVE')
	active = false;

	/** Port for worker to respond to health checks requests on, if enabled. */
	@Env('QUEUE_HEALTH_CHECK_PORT')
	port = 5678;
}

@Config
class RedisConfig {
	/** Redis database for Bull queue. */
	@Env('QUEUE_BULL_REDIS_DB')
	db = 0;

	/** Redis host for Bull queue. */
	@Env('QUEUE_BULL_REDIS_HOST')
	host = 'localhost';

	/** Password to authenticate with Redis. */
	@Env('QUEUE_BULL_REDIS_PASSWORD')
	password = '';

	/** Port for Redis to listen on. */
	@Env('QUEUE_BULL_REDIS_PORT')
	port = 6379;

	/** Max cumulative timeout (in milliseconds) of connection retries before process exit. */
	@Env('QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD')
	timeoutThreshold = 10_000;

	/** Redis username. Redis 6.0 or higher required. */
	@Env('QUEUE_BULL_REDIS_USERNAME')
	username = '';

	/** Redis cluster startup nodes, as comma-separated list of `{host}:{port}` pairs. @example 'redis-1:6379,redis-2:6379' */
	@Env('QUEUE_BULL_REDIS_CLUSTER_NODES')
	clusterNodes = '';

	/** Whether to enable TLS on Redis connections. */
	@Env('QUEUE_BULL_REDIS_TLS')
	tls = false;
}

@Config
class SettingsConfig {
	/** How long (in milliseconds) is the lease period for a worker processing a job. */
	@Env('QUEUE_WORKER_LOCK_DURATION')
	lockDuration = 30_000;

	/** How often (in milliseconds) a worker must renew the lease. */
	@Env('QUEUE_WORKER_LOCK_RENEW_TIME')
	lockRenewTime = 15_000;

	/** How often (in milliseconds) Bull must check for stalled jobs. `0` to disable. */
	@Env('QUEUE_WORKER_STALLED_INTERVAL')
	stalledInterval = 30_000;

	/** Max number of times a stalled job will be re-processed. See Bull's [documentation](https://docs.bullmq.io/guide/workers/stalled-jobs). */
	@Env('QUEUE_WORKER_MAX_STALLED_COUNT')
	maxStalledCount = 1;
}

@Config
class BullConfig {
	/** Prefix for Bull keys on Redis. @example 'bull:jobs:23' */
	@Env('QUEUE_BULL_PREFIX')
	prefix = 'bull';

	@Nested
	redis: RedisConfig;

	/** How often (in seconds) to poll the Bull queue to identify executions finished during a Redis crash. `0` to disable. May increase Redis traffic significantly. */
	@Env('QUEUE_RECOVERY_INTERVAL')
	queueRecoveryInterval = 60; // watchdog interval

	/** @deprecated How long (in seconds) a worker must wait for active executions to finish before exiting. Use `N8N_GRACEFUL_SHUTDOWN_TIMEOUT` instead */
	@Env('QUEUE_WORKER_TIMEOUT')
	gracefulShutdownTimeout = 30;

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
