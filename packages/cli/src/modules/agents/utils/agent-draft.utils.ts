import type { OperationContext } from '@n8n/db';
import { v4 as uuid } from 'uuid';

import { BadRequestError, ConflictError } from '@n8n/errors';

import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentDefinitionMetadata } from './agent-definition';

/** Each changed definition needs an ID that cannot refer to an older snapshot. */
export function markAgentDraftDirty(agent: Agent): void {
	agent.versionId = uuid();
}

/**
 * Persist a draft edit through the revision fence, surfacing a fence loss as a
 * user-retryable conflict. All draft writes must go through this (never a
 * full-entity `save`), so a concurrent publish/unpublish can never be rolled
 * back by a stale entity, and the loser is told to retry against fresh state.
 */
export async function saveAgentDraftFenced(
	agentRepository: AgentRepository,
	agent: Agent,
	ctx: OperationContext = {},
	metadata?: AgentDefinitionMetadata,
	{ allowArchivedUpdate = false }: { allowArchivedUpdate?: boolean } = {},
): Promise<Agent> {
	if (agent.isArchived && !allowArchivedUpdate) {
		throw new BadRequestError('Cannot update an archived agent');
	}
	const won = await agentRepository.saveDraftFenced(agent, ctx, metadata, {
		allowArchivedUpdate,
	});
	if (!won) {
		throw new ConflictError('Agent was modified concurrently; please retry');
	}
	return agent;
}
