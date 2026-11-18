import { MCP_INSTANCE_SCOPES, type McpScope } from '@n8n/api-types';

import { TOOLS_BY_SCOPE } from './mcp-scopes';

/**
 * The `_meta` key that names a tool's group in `tools/list`. A client that
 * browses tools by area (the n8n Assistant's tool catalog) reads it; every
 * other client ignores it. Groups use the Assistant's names so its catalog
 * descriptions apply.
 */
export const MCP_TOOL_GROUP_META_KEY = 'n8n/group';

const GROUP_BY_SCOPE: Record<McpScope, string> = {
	'workflow:read': 'workflows',
	'workflow:write': 'workflows',
	'workflow:execute': 'workflows',
	'execution:read': 'executions',
	'agent:read': 'agents',
	'agent:write': 'agents',
	'agent:execute': 'agents',
	'skill:read': 'skills',
	'skill:write': 'skills',
	'credential:read': 'credentials',
	'credential:update': 'credentials',
	'dataTable:read': 'data_tables',
	'dataTable:write': 'data_tables',
	'project:read': 'instance',
	'project:write': 'instance',
	'tag:read': 'instance',
	'communityPackage:install': 'nodes',
	'aiPreference:read': 'preferences',
	'aiPreference:write': 'preferences',
	'breakingChanges:list': 'migration',
	'breakingChanges:migrate': 'migration',
};

/** Tools whose group is not the one of their scope. */
const GROUP_OVERRIDES: Record<string, string> = {
	search_nodes: 'nodes',
	get_node_types: 'nodes',
	validate_node_config: 'nodes',
	explore_node_resources: 'nodes',
	get_node_usage: 'nodes',
	get_instance_context: 'instance',
	get_instance_activity: 'instance',
	expand_instance_activity: 'instance',
	get_dependencies: 'instance',
	list_workflow_tags: 'instance',
};

const GROUP_BY_TOOL = new Map<string, string>();
for (const scope of MCP_INSTANCE_SCOPES) {
	const group = GROUP_BY_SCOPE[scope];
	for (const tool of TOOLS_BY_SCOPE[scope]) {
		if (!GROUP_BY_TOOL.has(tool)) GROUP_BY_TOOL.set(tool, group);
	}
}
for (const [tool, group] of Object.entries(GROUP_OVERRIDES)) GROUP_BY_TOOL.set(tool, group);

/** Returns the group of a tool, or undefined for a tool that has none. */
export function getMcpToolGroup(toolName: string): string | undefined {
	return GROUP_BY_TOOL.get(toolName);
}
