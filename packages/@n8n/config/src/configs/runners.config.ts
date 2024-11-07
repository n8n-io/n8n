import { Config, Env } from '../decorators';

/**
 * Modes for running a task runner:
 *
 * - In `internal_childprocess` mode, n8n launches a task runner as a child
 *   process. n8n manages the runner's lifecycle.
 * - In `internal_launcher` mode, n8n runs an
 *   [executable](https://github.com/n8n-io/task-runner-launcher) that launches
 *   a task runner as a child process. n8n manages the runner's lifecycle.
 * - In `external` mode, n8n does not launch the runner or manage its lifecycle.
 *   Rather, a third party launches and manages the runner separately from n8n.
 *
 * Lifecycle management means that n8n launches the task runner only when needed
 * and shuts it down when the task runner has been idle for too long.
 */
export type TaskRunnerMode = 'internal_childprocess' | 'internal_launcher' | 'external';

@Config
export class TaskRunnersConfig {
	@Env('N8N_RUNNERS_ENABLED')
	enabled: boolean = false;

	// Defaults to true for now
	@Env('N8N_RUNNERS_MODE')
	mode: TaskRunnerMode = 'internal_childprocess';

	@Env('N8N_RUNNERS_PATH')
	path: string = '/runners';

	@Env('N8N_RUNNERS_AUTH_TOKEN')
	authToken: string = '';

	/** IP address task runners server should listen on */
	@Env('N8N_RUNNERS_SERVER_PORT')
	port: number = 5679;

	/** IP address task runners server should listen on */
	@Env('N8N_RUNNERS_SERVER_LISTEN_ADDRESS')
	listenAddress: string = '127.0.0.1';

	/** Maximum size of a payload sent to the runner in bytes, Default 1G */
	@Env('N8N_RUNNERS_MAX_PAYLOAD')
	maxPayload: number = 1024 * 1024 * 1024;

	@Env('N8N_RUNNERS_LAUNCHER_PATH')
	launcherPath: string = '';

	/** Which task runner to launch from the config */
	@Env('N8N_RUNNERS_LAUNCHER_RUNNER')
	launcherRunner: string = 'javascript';

	/** The --max-old-space-size option to use for the runner (in MB). Default means node.js will determine it based on the available memory. */
	@Env('N8N_RUNNERS_MAX_OLD_SPACE_SIZE')
	maxOldSpaceSize: string = '';

	/** How many concurrent tasks can a runner execute at a time */
	@Env('N8N_RUNNERS_MAX_CONCURRENCY')
	maxConcurrency: number = 5;

	/** Should the output of deduplication be asserted for correctness */
	@Env('N8N_RUNNERS_ASSERT_DEDUPLICATION_OUTPUT')
	assertDeduplicationOutput: boolean = false;

	/** How long (in minutes) until shutting down an idle runner. */
	@Env('N8N_RUNNERS_IDLE_TIMEOUT')
	idleTimeout: number = 5;

	/** How often (in minutes) to check if a runner is idle. */
	@Env('N8N_RUNNERS_IDLE_CHECKS_FREQUENCY')
	idleChecksFrequency: number = 1;
}
