import { Config, Env } from '../decorators';

/**
 * Whether to enable task runners and how to run them
 * - internal_childprocess: Task runners are run as a child process and launched by n8n
 * - internal_launcher: Task runners are run as a child process and launched by n8n using a separate launch program
 * - external: Task runners are run as a separate program not launched by n8n
 */
export type TaskRunnerMode = 'internal_childprocess' | 'internal_launcher' | 'external';

@Config
export class TaskRunnersConfig {
	// Defaults to true for now
	@Env('N8N_RUNNERS_DISABLED')
	disabled: boolean = true;

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
}
