import { Config, Env, Nested } from '@n8n/config';

@Config
class HealthcheckServerConfig {
	@Env('N8N_RUNNERS_HEALTH_CHECK_SERVER_ENABLED')
	enabled: boolean = false;

	@Env('N8N_RUNNERS_HEALTH_CHECK_SERVER_HOST')
	host: string = '127.0.0.1';

	@Env('N8N_RUNNERS_HEALTH_CHECK_SERVER_PORT')
	port: number = 5681;
}

@Config
export class BaseRunnerConfig {
	@Env('N8N_RUNNERS_TASK_BROKER_URI')
	taskBrokerUri: string = 'http://127.0.0.1:5679';

	@Env('N8N_RUNNERS_GRANT_TOKEN')
	grantToken: string = '';

	@Env('N8N_RUNNERS_MAX_PAYLOAD')
	maxPayloadSize: number = 1024 * 1024 * 1024;

	/**
	 * How many concurrent tasks can a runner execute at a time
	 *
	 * Kept high for backwards compatibility - n8n v2 will reduce this to `5`
	 */
	@Env('N8N_RUNNERS_MAX_CONCURRENCY')
	maxConcurrency: number = 10;

	/**
	 * How long (in seconds) a runner may be idle for before exit. Intended
	 * for use in `external` mode - launcher must pass the env var when launching
	 * the runner. Disabled with `0` on `internal` mode.
	 */
	@Env('N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT')
	idleTimeout: number = 0;

	/**
	 * How long (in seconds) the runner keeps offering and serving tasks after being asked
	 * to shut down, before it commits to draining. Mirrors n8n's graceful-shutdown period.
	 * In external mode the orchestrator's termination grace (e.g. k8s
	 * terminationGracePeriodSeconds) must exceed this, or the runner is killed mid-drain.
	 */
	@Env('N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT')
	gracefulShutdownTimeout: number = 30;

	/**
	 * Extra seconds after the grace period before the runner force-exits itself, as a
	 * backstop for a stuck graceful stop. In external mode the launcher force-kills the
	 * runner one further margin later (at grace + 2 × this), so it never kills a runner
	 * that is still within its own backstop.
	 */
	@Env('N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN')
	shutdownForceKillMargin: number = 10;

	@Env('GENERIC_TIMEZONE')
	timezone: string = 'America/New_York';

	/**
	 * How long (in seconds) a task is allowed to take for completion, else the
	 * task will be aborted. (In internal mode, the runner will also be
	 * restarted.) Must be greater than 0.
	 *
	 * Kept high for backwards compatibility - n8n v2 will reduce this to `60`
	 */
	@Env('N8N_RUNNERS_TASK_TIMEOUT')
	taskTimeout: number = 300; // 5 minutes

	@Nested
	healthcheckServer!: HealthcheckServerConfig;
}
