import { mock } from 'vitest-mock-extended';

import type { AgentMemoryEntryEntity } from '@/modules/agents/entities/agent-memory-entry.entity';
import type { AgentMemoryEntryCandidateEntity } from '@/modules/agents/entities/agent-memory-entry-candidate.entity';
import type { AgentObservationEntity } from '@/modules/agents/entities/agent-observation.entity';
import type { AgentMemoryEntryCandidateRepository } from '@/modules/agents/repositories/agent-memory-entry-candidate.repository';
import type { AgentMemoryEntryRepository } from '@/modules/agents/repositories/agent-memory-entry.repository';
import type { AgentObservationRepository } from '@/modules/agents/repositories/agent-observation.repository';

import { EvalAgentMemoryReader } from '../agent-eval-memory-reader';

function setup() {
	const candidates = mock<AgentMemoryEntryCandidateRepository>();
	const entries = mock<AgentMemoryEntryRepository>();
	const observations = mock<AgentObservationRepository>();
	return {
		reader: new EvalAgentMemoryReader(candidates, entries, observations),
		candidates,
		entries,
		observations,
	};
}

describe('EvalAgentMemoryReader', () => {
	it('counts the pending candidates of the resource', async () => {
		const { reader, candidates } = setup();
		candidates.findPendingForResource.mockResolvedValue([
			mock<AgentMemoryEntryCandidateEntity>(),
			mock<AgentMemoryEntryCandidateEntity>(),
		]);

		expect(await reader.pendingCandidateCount('agent-1', 'eval-user-1')).toBe(2);
		expect(candidates.findPendingForResource).toHaveBeenCalledWith(
			'agent-1',
			'eval-user-1',
			expect.any(Number),
			{},
		);
	});

	it("reads the threads' active observations and the resource's active entries", async () => {
		const { reader, entries, observations } = setup();
		observations.find.mockResolvedValue([
			mock<AgentObservationEntity>({
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Allergic to peanuts',
			}),
		]);
		entries.find.mockResolvedValue([
			mock<AgentMemoryEntryEntity>({
				content: 'The user is allergic to peanuts',
				createdAt: new Date('2026-11-27T10:00:00.000Z'),
			}),
		]);

		expect(await reader.read('agent-1', 'eval-user-1', ['thread-1'])).toEqual({
			observations: [{ threadId: 'thread-1', marker: 'important', text: 'Allergic to peanuts' }],
			episodicEntries: [
				{ content: 'The user is allergic to peanuts', createdAt: '2026-11-27T10:00:00.000Z' },
			],
		});
		expect(entries.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { agentId: 'agent-1', resourceId: 'eval-user-1', status: 'active' },
			}),
		);
	});

	it('reads no observations without threads', async () => {
		const { reader, entries, observations } = setup();
		entries.find.mockResolvedValue([]);

		expect((await reader.read('agent-1', 'eval-user-1', [])).observations).toEqual([]);
		expect(observations.find).not.toHaveBeenCalled();
	});
});
