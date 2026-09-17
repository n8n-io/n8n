import { v4 as uuid } from 'uuid';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

/** The repository's opaque transaction handle, without importing the ORM here. */
type DraftSaveTransaction = Parameters<AgentRepository['saveDraftFenced']>[1];

/**
 * Start a new draft if the agent is currently in sync with the published snapshot.
 * Any mutation that changes how the agent would run must call this so that
 * `hasUnpublishedChanges` stays accurate.
 */
export function markAgentDraftDirty(agent: Agent): void {
	if (agent.versionId !== null && agent.versionId === agent.activeVersionId) {
		agent.versionId = uuid();
	}
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
	trx?: DraftSaveTransaction,
): Promise<Agent> {
	const won = await agentRepository.saveDraftFenced(agent, trx);
	if (!won) {
		throw new ConflictError('Agent was modified concurrently; please retry');
	}
	return agent;
}
