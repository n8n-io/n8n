import {
	AI_VENDOR_NODE_TYPES,
	CHAT_TOOL_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	isToolType,
	isTriggerNodeType,
} from 'n8n-workflow';

const AGENT_BUILDER_AI_UTILITY_TOOL_NODE_TYPES = [
	'toolCalculator',
	'toolThink',
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolThink',
] as const;

/**
 * Single source of truth for tools the agent builder must not offer: both the
 * tools picker and the builder agent's node discovery consult it, so the two
 * cannot drift apart.
 */
export const AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES: readonly string[] = [
	...AI_VENDOR_NODE_TYPES.map((nodeType) => `${nodeType}Tool`),
	CHAT_TOOL_NODE_TYPE,
	// Replaced by the standard HTTP Request node's usable-as-tool variant
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
	// Agents call workflows via native workflow tools, not the sub-workflow node
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	// Agents call other agents as native sub-agents, not through the workflow node
	'n8n-nodes-base.messageAnAgentTool',
	// Reasoning helpers an agent does not need
	...AGENT_BUILDER_AI_UTILITY_TOOL_NODE_TYPES,
	// Provider nodes: an agent already has its own model
	...AI_VENDOR_NODE_TYPES,
];

const hiddenAgentToolNodeTypes = new Set<string>(AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES);

const MCP_CLIENT_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpClientTool';
const MCP_REGISTRY_PACKAGE_NAME = '@n8n/mcp-registry';

export const isAgentToolNodeType = (nodeId: string): boolean => {
	if (isTriggerNodeType(nodeId)) return false;
	if (hiddenAgentToolNodeTypes.has(nodeId)) return false;
	if (nodeId === MCP_CLIENT_TOOL_NODE_TYPE || nodeId.startsWith(MCP_REGISTRY_PACKAGE_NAME)) {
		return false;
	}
	return isToolType(nodeId, { includeHitl: false });
};
