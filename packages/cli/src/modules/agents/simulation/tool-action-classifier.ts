import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

/** Whether a tool call is a safe read-through or a write that must be held. */
export type ToolActionMode = 'read_through' | 'write_hold';

export interface ClassifiableToolAction {
	toolName: string;
	kind?: string;
	nodeType?: string;
	nodeParameters?: unknown;
	/** Explicit HTTP method when known (for example from an HTTP request). */
	httpMethod?: string;
	/** Raw MCP tool name when the tool comes from an MCP server. */
	mcpToolName?: string;
}

const READ_HTTP_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD']);

// Any match in this set forces write_hold, even when a read verb also appears (e.g. getOrCreate).
const WRITE_TOKENS: ReadonlySet<string> = new Set([
	'post',
	'put',
	'patch',
	'delete',
	'del',
	'remove',
	'rm',
	'send',
	'create',
	'new',
	'add',
	'insert',
	'append',
	'upsert',
	'update',
	'edit',
	'modify',
	'set',
	'write',
	'save',
	'reply',
	'respond',
	'comment',
	'publish',
	'unpublish',
	'archive',
	'unarchive',
	'close',
	'reopen',
	'clear',
	'purge',
	'reset',
	'assign',
	'unassign',
	'move',
	'copy',
	'duplicate',
	'clone',
	'transfer',
	'upload',
	'import',
	'invite',
	'kick',
	'ban',
	'block',
	'unblock',
	'mark',
	'flag',
	'star',
	'unstar',
	'pin',
	'unpin',
	'react',
	'label',
	'draft',
	'trigger',
	'execute',
	'run',
	'invoke',
	'call',
	'submit',
	'approve',
	'reject',
	'cancel',
	'refund',
	'charge',
	'pay',
	'merge',
	'sync',
	'subscribe',
	'unsubscribe',
	'enroll',
	'complete',
	'start',
	'stop',
	'pause',
	'resume',
	'enable',
	'disable',
	'toggle',
	'lock',
	'unlock',
	'link',
	'unlink',
	'attach',
	'detach',
	'share',
	'revoke',
]);

const READ_TOKENS: ReadonlySet<string> = new Set([
	'get',
	'getall',
	'getmany',
	'getone',
	'list',
	'search',
	'read',
	'find',
	'lookup',
	'fetch',
	'retrieve',
	'describe',
	'inspect',
	'count',
	'check',
	'view',
	'show',
	'history',
	'replies',
	'head',
]);

const ALWAYS_HELD_KINDS: ReadonlySet<string> = new Set([
	'custom',
	'workflow',
	'integration',
	'other',
]);

/** Dynamic n8n expressions cannot be classified statically and default to write_hold. */
function isExpression(value: string): boolean {
	const trimmed = value.trim();
	return trimmed.startsWith('=') || trimmed.includes('{{');
}

/** Splits camelCase, PascalCase, snake_case, kebab-case, and punctuated names into lowercase tokens. */
function tokenizeIdentifier(value: string): string[] {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length > 0);
}

function classifyTokens(tokens: string[]): ToolActionMode {
	if (tokens.length === 0) return 'write_hold';
	if (tokens.some((token) => WRITE_TOKENS.has(token))) return 'write_hold';
	if (tokens.some((token) => READ_TOKENS.has(token))) return 'read_through';
	return 'write_hold';
}

/** Classifies an HTTP method. Only GET and HEAD are read-through; all others default to write_hold. */
export function classifyHttpMethod(method: unknown): ToolActionMode {
	if (typeof method !== 'string') return 'write_hold';
	if (isExpression(method)) return 'write_hold';
	const normalized = method.trim().toUpperCase();
	return READ_HTTP_METHODS.has(normalized) ? 'read_through' : 'write_hold';
}

/**
 * Classifies a tool call as `read_through` or `write_hold`.
 * Fails closed: any unknown, dynamic, or ambiguous operation returns `write_hold`.
 */
export function classifyToolAction(action: ClassifiableToolAction): ToolActionMode {
	if (action.kind !== undefined && ALWAYS_HELD_KINDS.has(action.kind)) {
		return 'write_hold';
	}

	if (action.httpMethod !== undefined) {
		return classifyHttpMethod(action.httpMethod);
	}

	if (isRecord(action.nodeParameters)) {
		const rawMethod = action.nodeParameters.method;
		if (typeof rawMethod === 'string' && rawMethod.trim() !== '') {
			return classifyHttpMethod(rawMethod);
		}
		if (action.nodeType === 'n8n-nodes-base.httpRequest') {
			return 'write_hold';
		}

		const rawOperation = action.nodeParameters.operation;
		if (typeof rawOperation === 'string' && rawOperation.trim() !== '') {
			if (isExpression(rawOperation)) return 'write_hold';
			return classifyTokens(tokenizeIdentifier(rawOperation));
		}
	} else if (action.nodeType === 'n8n-nodes-base.httpRequest') {
		return 'write_hold';
	}

	const name = action.mcpToolName ?? action.toolName;
	if (!name || isExpression(name)) return 'write_hold';
	return classifyTokens(tokenizeIdentifier(name));
}

/** Classifies a runtime `BuiltTool` from its metadata, node parameters, or MCP tool name. */
export function classifyBuiltToolAction(tool: BuiltTool): ToolActionMode {
	if (tool.mcpTool) {
		return classifyToolAction({
			toolName: tool.name,
			kind: 'mcp',
			mcpToolName: tool.mcpToolName ?? tool.name,
		});
	}

	const metadata = tool.metadata;
	const kind = typeof metadata?.kind === 'string' ? metadata.kind : undefined;
	if (metadata?.customTool === true) {
		return 'write_hold';
	}

	return classifyToolAction({
		toolName: tool.name,
		kind,
		nodeType: typeof metadata?.nodeType === 'string' ? metadata.nodeType : undefined,
		nodeParameters: metadata?.nodeParameters,
	});
}
