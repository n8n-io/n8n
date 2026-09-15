import { OperationalError } from 'n8n-workflow';

import type { Agent } from '../entities/agent.entity';

export function getPublishedAgentSnapshot(agentEntity: Agent): Agent {
	const activeVersionSchema = agentEntity.activeVersion?.schema;
	if (!activeVersionSchema) {
		throw new OperationalError(
			'Agent is not published. Publish the agent before using it in a workflow.',
		);
	}

	return {
		...agentEntity,
		schema: activeVersionSchema,
		tools: agentEntity.activeVersion?.tools ?? {},
		skills: agentEntity.activeVersion?.skills ?? {},
	} as Agent;
}
