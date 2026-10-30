import type { McpToolCategory, McpToolPermission, McpToolPermissions } from '@n8n/api-types';

export interface McpToolAnnotations {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
	idempotentHint?: boolean;
	openWorldHint?: boolean;
}

export interface McpToolDescriptor {
	name: string;
	annotations?: McpToolAnnotations;
}

export interface CompiledMcpToolPermissions {
	toolFilter?: { mode: 'exclude'; tools: string[] };
	requireApproval?: boolean | string[];
}

const READ_SEGMENTS = new Set([
	'describe',
	'fetch',
	'find',
	'get',
	'inspect',
	'list',
	'lookup',
	'preview',
	'query',
	'read',
	'retrieve',
	'search',
]);

const WRITE_SEGMENTS = new Set([
	'add',
	'append',
	'archive',
	'cancel',
	'create',
	'delete',
	'disable',
	'edit',
	'enable',
	'execute',
	'import',
	'insert',
	'invite',
	'move',
	'publish',
	'remove',
	'rename',
	'restore',
	'revoke',
	'run',
	'send',
	'set',
	'submit',
	'trigger',
	'update',
	'upload',
	'write',
]);

function toolNameSegments(name: string): string[] {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((segment) => segment.length > 0);
}

export function classifyMcpTool(tool: McpToolDescriptor): McpToolCategory {
	const segments = toolNameSegments(tool.name);
	const hasWriteName = segments.some((segment) => WRITE_SEGMENTS.has(segment));

	if (tool.annotations?.readOnlyHint === false || tool.annotations?.destructiveHint === true) {
		return 'write';
	}

	if (tool.annotations?.readOnlyHint === true) {
		return 'read';
	}

	if (hasWriteName) return 'write';

	return segments.some((segment) => READ_SEGMENTS.has(segment)) ? 'read' : 'write';
}

export function resolveMcpToolPermission(
	policy: McpToolPermissions,
	tool: McpToolDescriptor,
): McpToolPermission {
	if (policy.tools && Object.hasOwn(policy.tools, tool.name)) {
		return policy.tools[tool.name];
	}

	return policy.categories[classifyMcpTool(tool)];
}

const PERMISSION_STRICTNESS: Record<McpToolPermission, number> = {
	always_allow: 0,
	require_approval: 1,
	blocked: 2,
};

/** Block is stricter than Ask first, and Ask first is stricter than Allow. */
export function stricterMcpToolPermission(
	a: McpToolPermission,
	b: McpToolPermission,
): McpToolPermission {
	return PERMISSION_STRICTNESS[a] >= PERMISSION_STRICTNESS[b] ? a : b;
}

export function compileMcpToolPermissions(
	policy: McpToolPermissions,
	tools: McpToolDescriptor[],
): CompiledMcpToolPermissions {
	return compileStricterMcpToolPermissions([policy], tools);
}

/**
 * Compiles the stricter value of several policies for each tool, for example
 * when an admin policy and a user policy both apply to one server.
 */
export function compileStricterMcpToolPermissions(
	policies: readonly McpToolPermissions[],
	tools: McpToolDescriptor[],
): CompiledMcpToolPermissions {
	const blockedTools: string[] = [];
	const approvalTools: string[] = [];
	for (const tool of tools) {
		const permission = policies
			.map((policy) => resolveMcpToolPermission(policy, tool))
			.reduce<McpToolPermission>(stricterMcpToolPermission, 'always_allow');
		if (permission === 'blocked') {
			blockedTools.push(tool.name);
			continue;
		}

		if (permission === 'require_approval') approvalTools.push(tool.name);
	}

	return {
		toolFilter: { mode: 'exclude' as const, tools: blockedTools },
		requireApproval: approvalTools,
	};
}
