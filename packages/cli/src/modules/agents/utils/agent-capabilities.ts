import {
	isDraftIntegration,
	type AgentIntegrationConfig,
	type AgentJsonConfig,
} from '@n8n/api-types';

/**
 * Capability kinds an agent can be configured with, mirroring
 * `agentCapabilityKindSchema` minus `agent` — that one covers the core identity
 * primitives (instructions, model, credential), which are required fields
 * rather than capabilities.
 */
export type AgentCapabilityCounts = {
	tool: number;
	skill: number;
	subAgent: number;
	mcpServer: number;
	vectorStore: number;
	task: number;
	channel: number;
};

/**
 * Count each capability the agent has configured. Half-finished entries don't
 * count: a channel without a credential and an MCP server without a URL are
 * both placeholders that validation reports as incomplete.
 */
export function countAgentCapabilities(
	config: AgentJsonConfig | null,
	integrations: AgentIntegrationConfig[] = config?.integrations ?? [],
): AgentCapabilityCounts {
	const size = (entries: readonly unknown[] | undefined) => entries?.length ?? 0;

	return {
		tool: size(config?.tools),
		skill: size(config?.skills),
		subAgent: size(config?.subAgents?.agents),
		mcpServer: size(config?.mcpServers?.filter((server) => server.url.trim() !== '')),
		vectorStore: size(config?.vectorStores),
		task: size(config?.tasks),
		channel: integrations.filter((integration) => !isDraftIntegration(integration)).length,
	};
}

export function totalAgentCapabilities(counts: AgentCapabilityCounts): number {
	return Object.values(counts).reduce((total, count) => total + count, 0);
}

/** Capability kinds with at least one configured entry, sorted for stable payloads. */
export function configuredCapabilityKinds(
	counts: AgentCapabilityCounts,
): Array<keyof AgentCapabilityCounts> {
	return (Object.keys(counts) as Array<keyof AgentCapabilityCounts>)
		.filter((kind) => counts[kind] > 0)
		.sort();
}

/**
 * Whether the agent had nothing behind it yet — the state a freshly created row
 * is in. A write leaving this state is the agent's creation for telemetry.
 *
 * `name` and `personalisation` are deliberately not consulted: an agent that
 * has only been renamed or recoloured has not been configured.
 */
export function isUnconfiguredAgent(
	schema: AgentJsonConfig | null,
	integrations: AgentIntegrationConfig[],
): boolean {
	if (!schema) return true;
	if (schema.model?.trim() || schema.instructions?.trim()) return false;
	return totalAgentCapabilities(countAgentCapabilities(schema, integrations)) === 0;
}
