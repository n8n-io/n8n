import { mock } from 'vitest-mock-extended';

import { AgentMemoryTraceService } from '../agent-memory-trace.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import type { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import type { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import type { TimelineEvent } from '../execution-recorder';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentMemoryEntryCandidateRepository } from '../repositories/agent-memory-entry-candidate.repository';
import type { AgentMemoryEntrySourceRepository } from '../repositories/agent-memory-entry-source.repository';
import type { AgentMemoryEntryRepository } from '../repositories/agent-memory-entry.repository';

const request = {
	agentId: 'agent-1',
	projectId: 'project-1',
	userId: 'viewer',
	threadId: 'current-thread',
};

function makeService() {
	const entryRepository = mock<AgentMemoryEntryRepository>();
	const sourceRepository = mock<AgentMemoryEntrySourceRepository>();
	const candidateRepository = mock<AgentMemoryEntryCandidateRepository>();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	entryRepository.findInAnyStatus.mockResolvedValue([]);
	sourceRepository.findByEntryIds.mockResolvedValue([]);
	sourceRepository.findByCandidateIds.mockResolvedValue([]);
	candidateRepository.findByToolCalls.mockResolvedValue([]);
	threadRepository.findManyByIds.mockResolvedValue([]);
	const service = new AgentMemoryTraceService(
		entryRepository,
		sourceRepository,
		candidateRepository,
		threadRepository,
	);
	return { service, entryRepository, sourceRepository, candidateRepository, threadRepository };
}

function toolCall(
	name: string,
	toolCallId: string,
	extra: Partial<TimelineEvent & { type: 'tool-call' }> = {},
): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'tool',
		name,
		toolCallId,
		input: {},
		output: {},
		startTime: 0,
		endTime: 0,
		success: true,
		...extra,
	};
}

function executions(...timeline: TimelineEvent[]): AgentExecution[] {
	return [{ timeline } as AgentExecution];
}

function entry(id: string, status: AgentMemoryEntryEntity['status']): AgentMemoryEntryEntity {
	return { id, status, content: `Content of ${id}` } as AgentMemoryEntryEntity;
}

function source(
	memoryEntryId: string,
	threadId: string,
	candidateId: string | null = null,
): AgentMemoryEntrySourceEntity {
	return {
		memoryEntryId,
		threadId,
		candidateId,
		evidenceText: `Evidence in ${threadId}`,
		createdAt: new Date('2026-10-01T10:00:00.000Z'),
	} as AgentMemoryEntrySourceEntity;
}

function thread(id: string, ownerId: string): AgentExecutionThread {
	return {
		id,
		ownerId,
		accessScope: 'user',
		agentId: request.agentId,
		projectId: request.projectId,
	} as AgentExecutionThread;
}

function candidate(
	toolCallId: string,
	status: AgentMemoryEntryCandidateEntity['status'],
): AgentMemoryEntryCandidateEntity {
	return {
		id: `candidate-${toolCallId}`,
		toolCallId,
		status,
		content: `Content of ${toolCallId}`,
		evidenceText: `Evidence of ${toolCallId}`,
	} as AgentMemoryEntryCandidateEntity;
}

describe('AgentMemoryTraceService', () => {
	describe('recalls', () => {
		it('resolves recalled entries with their status and newest source', async () => {
			const { service, entryRepository, sourceRepository, threadRepository } = makeService();
			entryRepository.findInAnyStatus.mockResolvedValue([
				entry('others', 'active'),
				entry('own', 'deleted'),
				entry('merged', 'superseded'),
			]);
			sourceRepository.findByEntryIds.mockResolvedValue([
				source('others', 'others-old-thread'),
				source('others', 'others-thread'),
				source('own', 'own-thread'),
			]);
			threadRepository.findManyByIds.mockResolvedValue([
				thread('others-thread', 'other-user'),
				thread('own-thread', 'viewer'),
			]);

			const result = await service.getThreadMemory({
				...request,
				executions: executions(
					toolCall('recall_memory', 'recall', {
						traceOutput: { entryIds: ['others', 'own', 'merged', 'missing'] },
					}),
				),
			});

			expect(entryRepository.findInAnyStatus).toHaveBeenCalledWith('agent-1', [
				'others',
				'own',
				'merged',
				'missing',
			]);
			expect(result.recalls).toEqual({
				recall: [
					{
						entryId: 'others',
						content: 'Content of others',
						status: 'active',
						origin: {
							threadId: 'others-thread',
							canOpen: false,
							evidence: 'Evidence in others-thread',
							createdAt: '2026-10-01T10:00:00.000Z',
						},
					},
					{
						entryId: 'own',
						content: 'Content of own',
						status: 'deleted',
						origin: expect.objectContaining({ threadId: 'own-thread', canOpen: true }),
					},
					{ entryId: 'merged', content: 'Content of merged', status: 'replaced' },
				],
			});
		});

		it('leaves out recalls without traced ids and failed or canceled calls', async () => {
			const { service } = makeService();

			const result = await service.getThreadMemory({
				...request,
				executions: executions(
					toolCall('recall_memory', 'before-tracing'),
					toolCall('recall_memory', 'failed', { success: false, traceOutput: { entryIds: [] } }),
					toolCall('recall_memory', 'canceled', { canceled: true, traceOutput: { entryIds: [] } }),
					toolCall('recall_memory', 'empty', { traceOutput: { entryIds: [] } }),
				),
			});

			expect(result.recalls).toEqual({ empty: [] });
		});
	});

	describe('flags', () => {
		it('reports each flag with the state of its capture and stored entry', async () => {
			const { service, candidateRepository, sourceRepository, entryRepository } = makeService();
			candidateRepository.findByToolCalls.mockResolvedValue([
				candidate('pending', 'pending'),
				candidate('failed', 'failed'),
				candidate('removed', 'deleted'),
				candidate('stored', 'completed'),
				candidate('entry-deleted', 'completed'),
				candidate('superseded', 'completed'),
			]);
			sourceRepository.findByCandidateIds.mockResolvedValue([
				source('stored-entry', 'current-thread', 'candidate-stored'),
				source('deleted-entry', 'current-thread', 'candidate-entry-deleted'),
				source('superseded-entry', 'current-thread', 'candidate-superseded'),
			]);
			entryRepository.findInAnyStatus.mockResolvedValue([
				entry('stored-entry', 'active'),
				entry('deleted-entry', 'deleted'),
				entry('superseded-entry', 'superseded'),
			]);
			const toolCallIds = ['pending', 'failed', 'removed', 'stored', 'entry-deleted', 'superseded'];

			const result = await service.getThreadMemory({
				...request,
				executions: executions(...toolCallIds.map((id) => toolCall('flag_memory', id))),
			});

			expect(candidateRepository.findByToolCalls).toHaveBeenCalledWith(
				'agent-1',
				'current-thread',
				toolCallIds,
				{},
			);
			expect(result.flags).toEqual({
				pending: {
					captureId: 'candidate-pending',
					content: 'Content of pending',
					evidence: 'Evidence of pending',
					status: 'pending',
				},
				failed: expect.objectContaining({ status: 'failed' }),
				removed: expect.objectContaining({ status: 'deleted' }),
				stored: expect.objectContaining({ status: 'stored' }),
				'entry-deleted': expect.objectContaining({ status: 'deleted' }),
				superseded: expect.objectContaining({ status: 'replaced' }),
			});
		});

		it('reports a flag as stored when a merge moved its source to an active replacement', async () => {
			const { service, candidateRepository, sourceRepository, entryRepository } = makeService();
			candidateRepository.findByToolCalls.mockResolvedValue([candidate('merged', 'completed')]);
			sourceRepository.findByCandidateIds.mockResolvedValue([
				source('replacement', 'current-thread', 'candidate-merged'),
				source('original', 'current-thread', 'candidate-merged'),
			]);
			entryRepository.findInAnyStatus.mockResolvedValue([
				entry('original', 'superseded'),
				entry('replacement', 'active'),
			]);

			const result = await service.getThreadMemory({
				...request,
				executions: executions(toolCall('flag_memory', 'merged')),
			});

			expect(result.flags).toEqual({ merged: expect.objectContaining({ status: 'stored' }) });
		});
	});
});
