import {
	AgentApprovalRouteSchema,
	type AgentApprovalRoute,
	type AgentJsonConfig,
	type AgentJsonSkillConfig,
	type StoredAgentConfig,
} from '@n8n/api-types';

/**
 * Skill refs of a JSON document. `undefined` means that an inbound document
 * has no skill list. The refs of a stored draft or version are always a list.
 */
export type AgentSkillRefs = AgentJsonSkillConfig[] | undefined;

/**
 * Compose the JSON document (`AgentJsonConfig`) from a stored config and its
 * skill refs. Use this only at the edges that show or accept the document:
 * REST, MCP, the agent builder tools and create with a config.
 */
export function toAgentDocument(config: StoredAgentConfig, refs: AgentSkillRefs): AgentJsonConfig {
	const { skills: _storedSkills, ...rest } = config;
	return {
		...rest,
		...(config.tools && { tools: config.tools.map(normalizeReviewRoute) }),
		...(config.mcpServers && { mcpServers: config.mcpServers.map(normalizeReviewRoute) }),
		...(refs === undefined ? {} : { skills: refs }),
	};
}

/** Split a JSON document into the stored config and its skill refs. Inverse of `toAgentDocument`. */
export function fromAgentDocument(document: AgentJsonConfig): {
	config: StoredAgentConfig;
	skillRefs: AgentSkillRefs;
} {
	const { skills, ...config } = document;
	return { config, skillRefs: skills };
}

/** Stored drafts and versions can still use the previous single-review route. */
function normalizeReviewRoute<T extends { approvalRoute?: AgentApprovalRoute }>(entry: T): T {
	if (
		entry.approvalRoute?.type !== 'configuration' ||
		Array.isArray(entry.approvalRoute.configurationIds)
	)
		return entry;
	const parsed = AgentApprovalRouteSchema.safeParse(entry.approvalRoute);
	return parsed.success ? { ...entry, approvalRoute: parsed.data } : entry;
}
