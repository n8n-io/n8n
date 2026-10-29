import type { AgentJsonConfig, AgentSkill, AgentTaskConfig } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import { toAgentDocument, type AgentSkillRefs } from '../json-config/agent-document';

/** Published chat settings stay in schema. Credential integrations stay on the agent. */
export interface AgentDefinition extends Pick<Agent, 'tools'> {
	/** The JSON document, with the skill refs. */
	schema: AgentJsonConfig | null;
	/** Skill bodies from the skills module, keyed by skill id. */
	skills: Record<string, AgentSkill>;
	tasks: ReadonlyMap<string, AgentTaskConfig>;
}

/**
 * Skill refs that a caller is about to save. A pre-save check passes them in
 * place of the stored refs, so that it checks the state that it will write.
 */
export interface PendingSkillRefs {
	skillRefs: AgentSkillRefs;
}

/** Complete authored content, before integrations are split from the configuration. */
export interface CompleteAgentDefinition extends Pick<Agent, 'name' | 'tools'> {
	config: AgentJsonConfig | null;
	tasks: ReadonlyMap<string, AgentTaskConfig>;
}

/**
 * Writes the skills that belong to one Agent. A complete save calls it in the Agent's
 * transaction, after the Agent row exists and before the skill refs are saved. A caller
 * passes it only when the save changes a skill that the Agent uses.
 */
export type AgentSkillWriter = (ctx: OperationContext) => Promise<void>;

/** Omitted metadata stays unchanged on ordinary saves and version restoration. */
export interface AgentDefinitionMetadata {
	availableInMCP?: boolean;
}

/** IDs reserved for new definitions, with their authorized destination projects. */
export interface PlannedAgentDestinations {
	agents?: ReadonlyMap<string, string>;
	workflows?: ReadonlyMap<string, string>;
}

export function findMissingAgentDefinitionBodies(
	definition: Pick<CompleteAgentDefinition, 'config' | 'tools' | 'tasks'>,
) {
	const references = [
		[
			'tools',
			definition.config?.tools?.filter((tool) => tool.type === 'custom') ?? [],
			new Set(Object.keys(definition.tools)),
		],
		['tasks', definition.config?.tasks ?? [], new Set(definition.tasks.keys())],
	] as const;
	return references.flatMap(([kind, refs, ids]) =>
		refs.filter(({ id }) => !ids.has(id)).map(({ id }) => ({ kind, id })),
	);
}

/** Keep configuration, inline bodies and skill bodies from the same draft or version. */
export function getAgentDefinitionContent(
	source: Pick<AgentHistory, 'schema' | 'tools'>,
	skillRefs: AgentSkillRefs,
	skills: Record<string, AgentSkill>,
) {
	return {
		schema: source.schema ? toAgentDocument(source.schema, skillRefs) : null,
		tools: source.tools ?? {},
		skills,
	};
}

export function getAgentTaskBody(task: AgentTaskConfig) {
	const { name, objective, cronExpression, timezone } = task;
	return { name, objective, cronExpression, timezone: timezone ?? null };
}
