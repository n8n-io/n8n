import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

export async function getAgentOrThrow(
	repository: AgentRepository,
	agentId: string,
	projectId: string,
	message = `Agent "${agentId}" not found`,
): Promise<Agent> {
	const agent = await repository.findByIdAndProjectId(agentId, projectId);
	if (!agent) throw new NotFoundError(message);
	return agent;
}
