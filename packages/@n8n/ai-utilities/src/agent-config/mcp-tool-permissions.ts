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

export function compileMcpToolPermissions(
	policy: McpToolPermissions,
	tools: McpToolDescriptor[],
): CompiledMcpToolPermissions {
	const blockedTools: string[] = [];
	const approvalTools: string[] = [];
	for (const tool of tools) {
		const permission = resolveMcpToolPermission(policy, tool);
		if (permission === 'block') {
			blockedTools.push(tool.name);
			continue;
		}

		if (permission === 'ask') approvalTools.push(tool.name);
	}

	return {
		toolFilter: { mode: 'exclude' as const, tools: blockedTools },
		requireApproval: approvalTools,
	};
}
