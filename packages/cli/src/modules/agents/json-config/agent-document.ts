import type { AgentJsonConfig, AgentJsonSkillConfig, StoredAgentConfig } from '@n8n/api-types';

/**
 * Skill refs of one agent draft or one published version, in document order.
 * `undefined` means that the config has no skill list. Keep this apart from an
 * empty list, because the config hash sees the difference.
 */
export type AgentSkillRefs = AgentJsonSkillConfig[] | undefined;

/**
 * Compose the JSON document (`AgentJsonConfig`) from a stored config and its
 * skill refs. Use this only at the edges that show or accept the document:
 * REST, MCP, the agent builder tools and create with a config.
 */
export function toAgentDocument(config: StoredAgentConfig, refs: AgentSkillRefs): AgentJsonConfig {
	const { skills: _storedSkills, ...rest } = config;
	return refs === undefined ? rest : { ...rest, skills: refs };
}

/** Split a JSON document into the stored config and its skill refs. Inverse of `toAgentDocument`. */
export function fromAgentDocument(document: AgentJsonConfig): {
	config: StoredAgentConfig;
	skillRefs: AgentSkillRefs;
} {
	const { skills, ...config } = document;
	return { config, skillRefs: skills };
}
