import type { AgentJsonConfig, AgentTaskConfig } from '@n8n/api-types';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import { toAgentDocument, type AgentSkillRefs } from '../json-config/agent-document';

/** Published chat settings stay in schema. Credential integrations stay on the agent. */
export interface AgentDefinition extends Pick<Agent, 'tools' | 'skills'> {
	/** The JSON document, with the skill refs. */
	schema: AgentJsonConfig | null;
	tasks: ReadonlyMap<string, AgentTaskConfig>;
}

/**
 * Skill refs that a caller is about to save. A pre-save check passes them in
 * place of the stored refs, so that it checks the state that it will write.
 */
export interface PendingSkillRefs {
	skillRefs: AgentSkillRefs;
}

/** Keep configuration and inline bodies from the same draft or version. */
export function getAgentDefinitionContent(
	source: Pick<AgentHistory, 'schema' | 'tools' | 'skills'>,
	skillRefs: AgentSkillRefs,
) {
	return {
		schema: source.schema ? toAgentDocument(source.schema, skillRefs) : null,
		tools: source.tools ?? {},
		skills: source.skills ?? {},
	};
}

export function getAgentTaskBody(task: AgentTaskConfig) {
	const { name, objective, cronExpression, timezone } = task;
	return { name, objective, cronExpression, timezone: timezone ?? null };
}
