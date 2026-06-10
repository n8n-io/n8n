import { AI_VENDOR_NODE_TYPES, CHAT_TOOL_NODE_TYPE } from 'n8n-workflow';

export const AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES: readonly string[] = [
	...AI_VENDOR_NODE_TYPES.map((nodeType) => `${nodeType}Tool`),
	CHAT_TOOL_NODE_TYPE,
];

export const AGENT_BUILDER_AVAILABLE_AI_UTILITY_TOOL_NODE_TYPES = [
	'toolCalculator',
	'toolThink',
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolThink',
] as const;
