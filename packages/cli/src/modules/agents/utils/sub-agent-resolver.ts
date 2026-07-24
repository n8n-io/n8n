import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

export type SubAgentConfigRef = { agentId: string; useWhen?: string };

export type ResolvedSubAgentRef = SubAgentConfigRef & { agent: Agent | null };

export async function resolveUniqueSubAgents({
	refs,
	projectId,
	agentRepository,
}: {
	refs: SubAgentConfigRef[];
	projectId: string;
	agentRepository: Pick<AgentRepository, 'findByIdAndProjectId'>;
}): Promise<ResolvedSubAgentRef[]> {
	const seen = new Set<string>();
	const resolved: ResolvedSubAgentRef[] = [];
	for (const ref of refs) {
		const { agentId } = ref;
		if (seen.has(agentId)) continue;
		seen.add(agentId);
		const resolvedRef: ResolvedSubAgentRef = {
			agentId,
			agent: await agentRepository.findByIdAndProjectId(agentId, projectId),
		};
		if (ref.useWhen !== undefined) {
			resolvedRef.useWhen = ref.useWhen;
		}
		resolved.push(resolvedRef);
	}
	return resolved;
}
