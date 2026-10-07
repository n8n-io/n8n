import { OperationalError } from 'n8n-workflow';

import type { Agent } from '../entities/agent.entity';
import { getAgentDefinitionContent } from './agent-definition';

export function getPublishedAgentSnapshot<T extends Agent>(agentEntity: T): T {
	const activeVersion = agentEntity.activeVersion;
	if (!activeVersion?.schema) {
		throw new OperationalError(
			'Agent is not published. Publish the agent before using it in a workflow.',
		);
	}

	return {
		...agentEntity,
		...getAgentDefinitionContent(activeVersion),
	};
}
