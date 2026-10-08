import { z } from 'zod';

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
	 * Generated tool variants are accepted too. The base node stays available.
	 *
	 * @example '["n8n-nodes-base.hackerNews", "n8n-nodes-base.dateTimeTool"]'
	 */
	@Env('NODES_EXCLUDE')
	exclude: JsonStringArray = ['n8n-nodes-base.executeCommand', 'n8n-nodes-base.localFileTrigger'];

	/** Node type name used as the default error trigger when workflow execution fails. */
	@Env('NODES_ERROR_TRIGGER_TYPE')
	errorTriggerType: string = 'n8n-nodes-base.errorTrigger';

	/** Whether to enable Python execution on the Code node. */
	@Env('N8N_PYTHON_ENABLED')
	pythonEnabled: boolean = true;

	/** Memory limit in MB for the Merge node's SQL sandbox. */
	@Env('NODES_MERGE_SQL_SANDBOX_MEMORY_LIMIT_MB', z.coerce.number().int().positive())
	mergeSqlSandboxMemoryLimitMb: number = 64;
	/**
	 * Refuse deprecated nodes. Saving or importing a workflow fails if it adds or
	 * changes one. A sub-workflow from inline JSON, a URL or a file, or a single
	 * node run by n8n Assistant, fails if it contains one. Saved workflows that
	 * already contain deprecated nodes keep running. Set to `false` to turn this
	 * off, for example to import older backups.
	 */
	@Env('N8N_DEPRECATED_NODES_BLOCK')
	blockDeprecated: boolean = true;
}
