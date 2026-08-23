import {
	AI_VENDOR_NODE_TYPES,
	CHAT_TOOL_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
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
	// Reasoning helpers an agent does not need
	...AGENT_BUILDER_AI_UTILITY_TOOL_NODE_TYPES,
	// Provider nodes: an agent already has its own model
	...AI_VENDOR_NODE_TYPES,
];
