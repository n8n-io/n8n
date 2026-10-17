import type { AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
export { sanitizeAgentToolName as sanitizeToolName } from '@n8n/api-types';

import { toAgentDocument, type AgentSkillRefs } from './agent-document';
import type { Agent } from '../entities/agent.entity';
import { getDraftIntegrations, type AgentChannelState } from '../utils/agent-channel-setup';

/**
 * Build the unified `AgentJsonConfig` view of an agent draft. The schema
 * column holds everything except skill refs and triggers. Skill refs come from
 * the skill refs seam, and triggers live on `agent.integrations`. The builder
 * LLM consumes the merged shape.
 */
export function composeJsonConfig(
	agent: Pick<Agent, 'schema'> & AgentChannelState,
	skillRefs: AgentSkillRefs,
): AgentJsonConfig | null {
	if (!agent.schema) return null;
	return {
		...toAgentDocument(agent.schema, skillRefs),
		integrations: getDraftIntegrations(agent),
	};
}

/**
 * Split an inbound `AgentJsonConfig` into the schema part and the part stored
 * on `agent.integrations`. Inverse of `composeJsonConfig`. The schema part still
 * holds the skill refs: use `fromAgentDocument` to split them off before a save.
 */
export function decomposeJsonConfig(config: AgentJsonConfig): {
	schemaConfig: Omit<AgentJsonConfig, 'integrations'>;
	integrations: AgentIntegrationConfig[];
} {
	const { integrations, ...schemaConfig } = config;
	return {
		schemaConfig,
		integrations: integrations ?? [],
	};
}
