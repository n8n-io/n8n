import { isRecord } from '@n8n/utils/is-record';

import { AI_MCP_TOOL_NODE_TYPE, MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';

// An AI Agent node attaches Message an Agent as its `…Tool` variant.
const MESSAGE_AN_AGENT_NODE_TYPES = new Set([
	MESSAGE_AN_AGENT_NODE_TYPE,
	`${MESSAGE_AN_AGENT_NODE_TYPE}Tool`,
]);

/**
 * The node types an inline agent embedded in a tool would run, at any depth.
 *
 * It mirrors `withInlineAgentToolNodes` in the backend, which decides what the publish gate
 * polices. The builder needs its own read because a working copy is not saved yet, so no
 * validation issue covers it: the gate stays the only thing that blocks a publish, and this
 * only decides what the UI explains.
 */
export function inlineAgentToolTypes(nodeType: string | undefined, parameters: unknown): string[] {
	if (nodeType === undefined || !MESSAGE_AN_AGENT_NODE_TYPES.has(nodeType)) return [];
	if (!isRecord(parameters) || parameters.agentSource !== 'inline') return [];

	// An expression has no tools to read until it runs; the tool executor polices it then.
	const raw = parameters.inlineAgent;
	const payload =
		typeof raw === 'string' && !raw.startsWith('=') ? safeParse(raw) : (raw as unknown);
	if (!isRecord(payload) || !isRecord(payload.config)) return [];

	const types: string[] = [];
	for (const tool of asArray(payload.config.tools)) {
		if (!isRecord(tool) || tool.type !== 'node' || !isRecord(tool.node)) continue;
		if (typeof tool.node.nodeType !== 'string') continue;

		types.push(tool.node.nodeType);
		types.push(...inlineAgentToolTypes(tool.node.nodeType, tool.node.nodeParameters));
	}
	// Every MCP server runs the MCP client, whatever the registry type it carries.
	if (asArray(payload.config.mcpServers).length > 0) types.push(AI_MCP_TOOL_NODE_TYPE);

	return types;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function safeParse(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
