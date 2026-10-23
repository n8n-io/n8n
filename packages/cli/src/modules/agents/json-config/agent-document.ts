import type { AgentJsonConfig, AgentJsonSkillConfig, StoredAgentConfig } from '@n8n/api-types';

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

/**
 * `next` with the legacy `skills` key of `previous`, when `previous` has one. A draft
 * save does not clear the legacy value. Nothing reads it, and a later release drops it.
 */
export function keepLegacySkillRefs(
	previous: StoredAgentConfig | null,
	next: StoredAgentConfig,
): StoredAgentConfig {
	if (previous?.skills === undefined) return next;
	return { ...next, skills: previous.skills };
}

/**
 * A stored config without the legacy `skills` key. Configs written before the
 * skills hub can still hold it. Nothing reads it, so do not copy it on.
 */
export function withoutLegacySkillRefs(config: StoredAgentConfig): StoredAgentConfig {
	const { skills: _legacy, ...rest } = config;
	return rest;
}
