import type { AgentJsonConfig, AgentJsonNodeToolConfig, AgentJsonToolRef } from '../types';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import { formatToolNameForDisplay } from './toolDisplayName';

/** Narrows a tool ref to a node tool with mocking enabled (AGENT-716, v1 scope: node tools only). */
export function isMockEnabledNodeTool(tool: AgentJsonToolRef): tool is AgentJsonNodeToolConfig {
	return tool.type === 'node' && tool.mock?.enabled === true;
}

/** Every mock-enabled node tool configured on the agent — used to derive the preview chat banner. */
export function mockedNodeTools(
	config: AgentJsonConfig | null | undefined,
): AgentJsonNodeToolConfig[] {
	return (config?.tools ?? []).filter(isMockEnabledNodeTool);
}

/**
 * Human-facing service name for a node tool (e.g. "Gmail" rather than the tool's
 * configured name), mirroring `AgentCapabilitiesSection`'s type-label logic.
 * Falls back to the tool's own name when the node type isn't resolvable.
 */
export function nodeToolServiceLabel(
	tool: AgentJsonNodeToolConfig,
	getNodeType: (type: string, version?: number) => { displayName: string } | undefined | null,
): string {
	const node = toolRefToNode(tool);
	const nodeType = node ? getNodeType(node.type, node.typeVersion) : null;
	const label = nodeType?.displayName?.replace(/ Tool$/, '');
	return label || formatToolNameForDisplay(tool.name) || tool.name;
}
