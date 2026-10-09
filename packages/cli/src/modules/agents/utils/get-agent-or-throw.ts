import { ForbiddenError, NotFoundError } from '@n8n/errors';

import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

/**
 * Refuses an instance agent with an explicit error. Project-scoped lookups
 * never find instance agents, so call this when a lookup misses, to tell the
 * caller that the agent is read-only instead of missing.
 */
export async function assertNotInstanceAgent(
	repository: AgentRepository,
	agentId: string,
): Promise<void> {
	if (await repository.isInstanceAgent(agentId)) {
		throw new ForbiddenError(`Agent "${agentId}" is an instance agent and is read-only`);
	}
}

export async function getAgentOrThrow(
	repository: AgentRepository,
	agentId: string,
	projectId: string,
	message = `Agent "${agentId}" not found`,
): Promise<ProjectAgent> {
	const agent = await repository.findByIdAndProjectId(agentId, projectId);
	if (agent) return agent;
	await assertNotInstanceAgent(repository, agentId);
	throw new NotFoundError(message);
}
