import type { Agent } from '../entities/agent.entity';

export function getAgentCurrentVersionId(agent: Pick<Agent, 'versionId' | 'updatedAt'>): string {
	return agent.versionId ?? agent.updatedAt.toISOString();
}
