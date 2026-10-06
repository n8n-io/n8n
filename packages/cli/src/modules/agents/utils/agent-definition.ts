import type { AgentTaskConfig } from '@n8n/api-types';

import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';

/** Published chat settings stay in schema. Credential integrations stay on the agent. */
export interface AgentDefinition extends Pick<Agent, 'schema' | 'tools' | 'skills'> {
	tasks: ReadonlyMap<string, AgentTaskConfig>;
}

/** Keep configuration and inline bodies from the same draft or version. */
export function getAgentDefinitionContent(
	source: Pick<AgentHistory, 'schema' | 'tools' | 'skills'>,
) {
	return { schema: source.schema, tools: source.tools ?? {}, skills: source.skills ?? {} };
}

export function getAgentTaskBody(task: AgentTaskConfig) {
	const { name, objective, cronExpression, timezone } = task;
	return { name, objective, cronExpression, timezone: timezone ?? null };
}
