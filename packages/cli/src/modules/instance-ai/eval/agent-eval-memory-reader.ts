import type { InstanceAiEvalAgentMemoryState } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { AgentMemoryEntryCandidateRepository } from '@/modules/agents/repositories/agent-memory-entry-candidate.repository';
import { AgentMemoryEntryRepository } from '@/modules/agents/repositories/agent-memory-entry.repository';
import { AgentObservationRepository } from '@/modules/agents/repositories/agent-observation.repository';

/** Enough to tell "none left" from "some left"; the eval never needs the exact backlog. */
const PENDING_CANDIDATE_PROBE = 100;

type StoredMemory = Pick<InstanceAiEvalAgentMemoryState, 'observations' | 'episodicEntries'>;

/**
 * Reads what an eval Agent's memory stored for one simulated user (resource),
 * so the judge can grade memory expectations against it and the eval can tell
 * whether background memory work has settled (AGENT-1666).
 */
@Service()
export class EvalAgentMemoryReader {
	constructor(
		private readonly candidates: AgentMemoryEntryCandidateRepository,
		private readonly entries: AgentMemoryEntryRepository,
		private readonly observations: AgentObservationRepository,
	) {}

	/** Flagged memories of the resource not yet turned into entries. */
	async pendingCandidateCount(agentId: string, resourceId: string): Promise<number> {
		const pending = await this.candidates.findPendingForResource(
			agentId,
			resourceId,
			PENDING_CANDIDATE_PROBE,
			{},
		);
		return pending.length;
	}

	/** Active observations of the threads and active episodic entries of the resource. */
	async read(agentId: string, resourceId: string, threadIds: string[]): Promise<StoredMemory> {
		const [observations, entries] = await Promise.all([
			threadIds.length === 0
				? []
				: this.observations.find({
						where: { agentId, observationScopeId: In(threadIds), status: 'active' },
						order: { createdAt: 'ASC', id: 'ASC' },
					}),
			this.entries.find({
				where: { agentId, resourceId, status: 'active' },
				order: { createdAt: 'ASC', id: 'ASC' },
			}),
		]);
		return {
			observations: observations.map(({ observationScopeId, marker, text }) => ({
				threadId: observationScopeId,
				marker,
				text,
			})),
			episodicEntries: entries.map(({ content, createdAt }) => ({
				content,
				createdAt: createdAt.toISOString(),
			})),
		};
	}
}
