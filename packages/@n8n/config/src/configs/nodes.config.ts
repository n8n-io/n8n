import { Config, Env } from '../decorators';

function isStringArray(input: unknown): input is string[] {
	return Array.isArray(input) && input.every((item) => typeof item === 'string');
}

class JsonStringArray extends Array<string> {
	constructor(str: string) {
		super();

		let parsed: unknown;

		try {
			parsed = JSON.parse(str);
		} catch {
			return [];
		}

		return isStringArray(parsed) ? parsed : [];
	}
}

@Config
export class NodesConfig {
	/** Node types to load. If empty, all available nodes are loaded. Example: `["n8n-nodes-base.hackerNews"]`. */
	@Env('NODES_INCLUDE')
	include: JsonStringArray = [];

	/**
	 * Node types to exclude from loading. Default excludes `ExecuteCommand` and `LocalFileTrigger` for security.
	 * Set to an empty array to allow all node types.
	 *
	 * @example '["n8n-nodes-base.hackerNews"]'
	 */
	@Env('NODES_EXCLUDE')
	exclude: JsonStringArray = ['n8n-nodes-base.executeCommand', 'n8n-nodes-base.localFileTrigger'];

	/** Node type name used as the default error trigger when workflow execution fails. */
	@Env('NODES_ERROR_TRIGGER_TYPE')
	errorTriggerType: string = 'n8n-nodes-base.errorTrigger';

	/** Whether to enable Python execution on the Code node. */
	@Env('N8N_PYTHON_ENABLED')
	pythonEnabled: boolean = true;

	/**
	 * Isolation driver used by the Secure Exec node.
	 * `auto` (default) picks Docker → Bubblewrap → Host in order of availability.
	 * `command-service` delegates to a remote command-execution-service over HTTP.
	 */
	@Env('N8N_SECURE_EXEC_DRIVER')
	secureExecDriver: 'auto' | 'docker' | 'bubblewrap' | 'host' | 'command-service' = 'auto';

	/** Default Docker image for the Secure Exec node when using the Docker driver. */
	@Env('N8N_SECURE_EXEC_DOCKER_IMAGE')
	secureExecDockerImage: string = 'ubuntu:24.04';

	/** Default timeout in milliseconds for Secure Exec node commands. */
	@Env('N8N_SECURE_EXEC_TIMEOUT_MS')
	secureExecTimeoutMs: number = 30_000;

	/**
	 * Base URL of the command-execution-service.
	 * Required when `N8N_SECURE_EXEC_DRIVER=command-service`.
	 * @example 'http://localhost:5682'
	 */
	@Env('N8N_SECURE_EXEC_COMMAND_SERVICE_URL')
	secureExecCommandServiceUrl: string = '';

	/**
	 * Additional host paths to bind-mount read-only into the bubblewrap sandbox.
	 * Useful when CLI tools (e.g. `claude`) are installed outside the standard
	 * system paths (`/usr`, `/bin`, `/lib`, etc.).
	 * JSON array of absolute paths.
	 * @example '["/home/user/.local/bin", "/opt/tools"]'
	 */
	@Env('N8N_SECURE_EXEC_EXTRA_BIND_PATHS')
	secureExecExtraBindPaths: JsonStringArray = [];
}
