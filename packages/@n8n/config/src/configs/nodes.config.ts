import { z } from 'zod';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';
import { nonnegativeIntSchema } from '../schemas';

/**
 * The broad permission classes that `N8N_NODE_PERMISSIONS_DENY` can deny:
 * - `egress-input`: requests to any host that the user enters, e.g. the HTTP Request contract nodes.
 * - `code`: user code in the task runner, e.g. the Code contract nodes.
 * - `files`: the files capability. No contract node has it yet.
 * - `full-community`: legacy community nodes, which have full access to the n8n server.
 */
export const NODE_PERMISSION_CLASSES = ['egress-input', 'code', 'files', 'full-community'] as const;

export type NodePermissionClass = (typeof NODE_PERMISSION_CLASSES)[number];

/** An unknown class stops the start: a typo must not let a denied node load. */
class NodePermissionClassArray extends CommaSeparatedStringArray<NodePermissionClass> {
	constructor(str: string) {
		super(str);
		const known: readonly string[] = NODE_PERMISSION_CLASSES;
		const unknown = this.find((name) => !known.includes(name));
		if (unknown !== undefined) {
			throw new Error(
				`Unknown node permission class in N8N_NODE_PERMISSIONS_DENY: "${unknown}". Valid classes: ${NODE_PERMISSION_CLASSES.join(', ')}.`,
			);
		}
	}
}

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
	 * Permission classes that no node may have. A contract node version with a denied class does
	 * not load or run, for first-party and community nodes alike. This includes a version from a
	 * workflow lock. `full-community` stops the install and the load of community packages. An
	 * unknown class stops the start. Legacy nodes, e.g.
	 * `n8n-nodes-base.httpRequest` and `n8n-nodes-base.code`, are not affected. Use `NODES_EXCLUDE`
	 * for them.
	 *
	 * @example 'egress-input,code'
	 */
	@Env('N8N_NODE_PERMISSIONS_DENY')
	permissionsDeny: NodePermissionClassArray = [];

	/**
	 * Host patterns that a node may reach with a URL that the user enters (`egress-input`), e.g.
	 * HTTP Request. `*.example.com` allows the subdomains of `example.com` only. Empty is no extra
	 * limit. A redirect of such a request may go only to the node hosts and to these hosts. Legacy
	 * nodes, e.g. `n8n-nodes-base.httpRequest`, are not affected. Use `NODES_EXCLUDE` for them.
	 *
	 * @example 'api.example.com,*.example.org'
	 */
	@Env('N8N_NODE_EGRESS_INPUT_HOSTS')
	egressInputHosts: CommaSeparatedStringArray<string> = [];

	/**
	 * The most MiB of one HTTP response body that a contract node reads, after decompression. A
	 * response over the limit fails the item, and n8n reads no more of it. The limit applies to a
	 * file download too. `0` is no limit. Legacy nodes, e.g. `n8n-nodes-base.httpRequest`, are not
	 * affected.
	 */
	@Env('N8N_NODE_RESPONSE_SIZE_MAX', nonnegativeIntSchema)
	responseSizeMaxMiB: number = 100;
}
