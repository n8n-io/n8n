import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

export async function resolveUniqueSubAgents({
	refs,
	projectId,
	agentRepository,
}: {
	refs: Array<{ agentId: string }>;
	projectId: string;
	agentRepository: Pick<AgentRepository, 'findByIdAndProjectId'>;
}): Promise<Array<{ agentId: string; agent: Agent | null }>> {
	const seen = new Set<string>();
	const resolved: Array<{ agentId: string; agent: Agent | null }> = [];
	for (const { agentId } of refs) {
		if (seen.has(agentId)) continue;
		seen.add(agentId);
		resolved.push({
			agentId,
			agent: await agentRepository.findByIdAndProjectId(agentId, projectId),
		});
	}
	return resolved;
}
