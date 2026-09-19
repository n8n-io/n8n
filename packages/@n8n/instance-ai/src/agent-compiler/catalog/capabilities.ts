import type { ChatIntegrationDescriptor } from '@n8n/api-types';

import { NodeRegistry } from '../../workflow-compiler/catalog/node-registry';

export interface CatalogWorkflow {
	id: string;
	name: string;
	published: boolean;
}

export interface CatalogAgent {
	agentId: string;
	name: string;
	published: boolean;
}

export interface CatalogDefaultModel {
	model: string;
	credential: string;
}

/**
 * Snapshot of what an agent in this project can be built from. Loaded once
 * per build from the builder delegate and never during planning, so the
 * compiler's decisions only ever range over options that exist.
 */
export interface AgentCapabilityCatalog {
	channels: ChatIntegrationDescriptor[];
	workflows: CatalogWorkflow[];
	agents: CatalogAgent[];
	nodeRegistry: NodeRegistry;
	defaultModel: CatalogDefaultModel | null;
	limitations: string[];
}

export interface AgentCapabilitySource {
	listAgentCapabilities(): Promise<{
		channels: ChatIntegrationDescriptor[];
		limitations: string[];
	}>;
	listAgents(): Promise<Array<{ agentId: string; name: string; published: boolean }>>;
	listAttachableWorkflows?(searchTerm?: string): Promise<CatalogWorkflow[]>;
	resolveDefaultModel?(): Promise<CatalogDefaultModel | null>;
}

export async function loadAgentCapabilityCatalog(
	source: AgentCapabilitySource,
	options: { nodeRegistry?: NodeRegistry; excludeAgentId?: string } = {},
): Promise<AgentCapabilityCatalog> {
	const [capabilities, agents, workflows, defaultModel] = await Promise.all([
		source.listAgentCapabilities(),
		source.listAgents().catch(() => []),
		source.listAttachableWorkflows?.().catch(() => []) ?? [],
		source.resolveDefaultModel?.().catch(() => null) ?? null,
	]);
	return {
		channels: capabilities.channels,
		limitations: capabilities.limitations,
		agents: agents.filter((agent) => agent.agentId !== options.excludeAgentId),
		workflows,
		nodeRegistry: options.nodeRegistry ?? new NodeRegistry(),
		defaultModel,
	};
}

/** Case-insensitive name match with a loose fallback (contains either way). */
export function findByName<T extends { name: string }>(items: readonly T[], name: string): T[] {
	const wanted = name.trim().toLowerCase();
	if (!wanted) return [];
	const exact = items.filter((item) => item.name.trim().toLowerCase() === wanted);
	if (exact.length > 0) return exact;
	return items.filter((item) => {
		const candidate = item.name.trim().toLowerCase();
		return candidate.includes(wanted) || wanted.includes(candidate);
	});
}
