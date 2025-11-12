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
	/** Node types to load. Includes all if unspecified. @example '["n8n-nodes-base.hackerNews"]' */
	@Env('NODES_INCLUDE')
	include: JsonStringArray = [];

	/** Node types not to load. Excludes none if unspecified. @example '["n8n-nodes-base.hackerNews"]' */
	@Env('NODES_EXCLUDE')
	exclude: JsonStringArray = [];

	/** Node type to use as error trigger */
	@Env('NODES_ERROR_TRIGGER_TYPE')
	errorTriggerType: string = 'n8n-nodes-base.errorTrigger';

	/** Whether to enable Python execution on the Code node. */
	@Env('N8N_PYTHON_ENABLED')
	pythonEnabled: boolean = true;

	/** Remote node repositories to load, should point to a repository manifest JSON file. @example '["https://raw.githubusercontent.com/yehorkardash/n8n-nodes/refs/heads/main/repository.json"]' */
	@Env('N8N_REMOTE_NODE_REPOSITORIES')
	remoteNodeRepositories: JsonStringArray = [];
}
