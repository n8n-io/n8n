import { Config, Env } from '../decorators';

/**
 * Whether to enable task runners and how to run them
 * - internal: Task runners are run as a child process and launched by n8n
 * - external: Task runners are run as a separate program not launched by n8n
 */
export type TaskRunnerMode = 'internal' | 'external';

@Config
export class TaskRunnersConfig {
	@Env('N8N_RUNNERS_ENABLED')
	enabled: boolean = false;

	// Defaults to true for now
	@Env('N8N_RUNNERS_MODE')
	mode: TaskRunnerMode = 'internal';

	/** Endpoint which task runners connect to */
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

	/** The --max-old-space-size option to use for the runner (in MB). Default means node.js will determine it based on the available memory. */
	@Env('N8N_RUNNERS_MAX_OLD_SPACE_SIZE')
	maxOldSpaceSize: string = '';

	/** How many concurrent tasks can a runner execute at a time */
	@Env('N8N_RUNNERS_MAX_CONCURRENCY')
	maxConcurrency: number = 5;

	/** Should the output of deduplication be asserted for correctness */
	@Env('N8N_RUNNERS_ASSERT_DEDUPLICATION_OUTPUT')
	assertDeduplicationOutput: boolean = false;

	/** How long (in seconds) a task is allowed to take for completion, else the task will be aborted and the runner restarted. Must be greater than 0. */
	@Env('N8N_RUNNERS_TASK_TIMEOUT')
	taskTimeout: number = 60;

	/** How often (in seconds) the runner must send a heartbeat to the broker, else the task will be aborted and the runner restarted. Must be greater than 0. */
	@Env('N8N_RUNNERS_HEARTBEAT_INTERVAL')
	heartbeatInterval: number = 30;
}
