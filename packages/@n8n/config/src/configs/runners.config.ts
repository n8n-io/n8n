import { z } from 'zod';

import { Config, Env } from '../decorators';

const runnerModeSchema = z.enum(['internal', 'external']);

export type TaskRunnerMode = z.infer<typeof runnerModeSchema>;

@Config
export class TaskRunnersConfig {
	/** Whether the task runner (for example, for Code node) is enabled. */
	enabled: boolean = true;

	/**
	 * How the task runner runs: `internal` (child process of n8n) or `external` (separate process).
	 */
	@Env('N8N_RUNNERS_MODE', runnerModeSchema)
	mode: TaskRunnerMode = 'internal';

	/** URL path segment where the task runner service is exposed (for example, `/runners`). */
	@Env('N8N_RUNNERS_PATH')
	path: string = '/runners';

	/** Shared secret used to authenticate runner processes with the broker. */
	@Env('N8N_RUNNERS_AUTH_TOKEN')
	authToken: string = '';

	/** Port the task runner broker listens on for runner connections. */
	@Env('N8N_RUNNERS_BROKER_PORT')
	port: number = 5679;

	/** IP address the task runner broker binds to. */
	@Env('N8N_RUNNERS_BROKER_LISTEN_ADDRESS')
	listenAddress: string = '127.0.0.1';

	/** Maximum size in bytes of a payload sent to a runner. Default: 1 GiB. */
	@Env('N8N_RUNNERS_MAX_PAYLOAD')
	maxPayload: number = 1024 * 1024 * 1024;

	/** Node.js `--max-old-space-size` value in MB for the runner process. Empty lets Node choose based on memory. */
	@Env('N8N_RUNNERS_MAX_OLD_SPACE_SIZE')
	maxOldSpaceSize: string = '';

	/** Maximum number of tasks a single runner can execute concurrently. */
	@Env('N8N_RUNNERS_MAX_CONCURRENCY')
	maxConcurrency: number = 10;

	/**
	 * How long (in seconds) a task is allowed to take for completion, else the
	 * task will be aborted. (In internal mode, the runner will also be
	 * restarted.) Must be greater than 0.
	 *
	 * Kept high for backwards compatibility - n8n v3 will reduce this to `60`
	 */
	@Env('N8N_RUNNERS_TASK_TIMEOUT')
	taskTimeout: number = 300; // 5 minutes

	/**
	 * How long (in seconds) a task request can wait for a runner to become
	 * available before timing out. This prevents workflows from hanging
	 * indefinitely when no runners are available. Must be greater than 0.
	 */
	@Env('N8N_RUNNERS_TASK_REQUEST_TIMEOUT')
	taskRequestTimeout: number = 60;

	/** Interval in seconds between heartbeats from runner to broker; missing heartbeats abort the task (and restart the runner in internal mode). Must be > 0. */
	@Env('N8N_RUNNERS_HEARTBEAT_INTERVAL')
	heartbeatInterval: number = 30;

	/**
	 * Whether to disable all security measures in the task runner. **Discouraged for production use.**
	 * Set to `true` for compatibility with modules that rely on insecure JS features.
	 */
	@Env('N8N_RUNNERS_INSECURE_MODE')
	insecureMode: boolean = false;
}
