import type { EpisodicMemoryCaptureKind } from '@n8n/agents';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import { AgentMessageEntity } from '../entities/agent-message.entity';

interface EnqueueCandidateInput {
	agentId: string;
	resourceId: string;
	threadId: string;
	sourceMessageId: string | null;
	runId: string;
	toolCallId: string;
	content: string;
	evidenceText: string;
	kind: EpisodicMemoryCaptureKind;
}

export type CandidateSourceMessage = Pick<AgentMessageEntity, 'author' | 'origin'>;

@Service()
export class AgentMemoryEntryCandidateRepository extends Repository<AgentMemoryEntryCandidateEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntryCandidateEntity, dataSource.manager);
	}

	async enqueueCandidate(input: EnqueueCandidateInput): Promise<AgentMemoryEntryCandidateEntity> {
		const existing = await this.findOneBy({
			agentId: input.agentId,
			runId: input.runId,
			toolCallId: input.toolCallId,
		});
		if (existing) return existing;

		try {
			return await this.save(this.create({ ...input, status: 'pending', attemptCount: 0 }));
		} catch (error) {
			const concurrentlyInserted = await this.findOneBy({
				agentId: input.agentId,
				runId: input.runId,
				toolCallId: input.toolCallId,
			});
			if (concurrentlyInserted) return concurrentlyInserted;
			throw error;
		}
	}

	async findPendingForResource(
		agentId: string,
		resourceId: string,
		limit: number,
	): Promise<AgentMemoryEntryCandidateEntity[]> {
		return await this.find({
			where: { agentId, resourceId, status: 'pending' },
			order: { createdAt: 'ASC', id: 'ASC' },
			take: limit,
		});
	}

	/** The candidates that flag_memory calls of one thread enqueued. */
	async findByToolCalls(
		agentId: string,
		threadId: string,
		toolCallIds: string[],
	): Promise<AgentMemoryEntryCandidateEntity[]> {
		if (toolCallIds.length === 0) return [];
		return await this.findBy({ agentId, threadId, toolCallId: In(toolCallIds) });
	}

	/** Resolves each candidate to the message it quoted. Candidates without a stored message are left out. */
	async findSourceMessages(
		agentId: string,
		candidateIds: string[],
	): Promise<Map<string, CandidateSourceMessage>> {
		const sourceMessages = new Map<string, CandidateSourceMessage>();
		if (candidateIds.length === 0) return sourceMessages;
		const candidates = await this.find({
			select: { id: true, sourceMessageId: true },
			where: { agentId, id: In(candidateIds) },
		});
		const messageIds = candidates.flatMap(({ sourceMessageId }) => sourceMessageId ?? []);
		if (messageIds.length === 0) return sourceMessages;
		const messages = await this.manager.find(AgentMessageEntity, {
			select: ['id', 'author', 'origin'],
			where: { id: In(messageIds) },
		});
		const messagesById = new Map(messages.map((message) => [message.id, message]));
		for (const { id, sourceMessageId } of candidates) {
			const message = sourceMessageId ? messagesById.get(sourceMessageId) : undefined;
			if (message) sourceMessages.set(id, { author: message.author, origin: message.origin });
		}
		return sourceMessages;
	}

	async markCandidatesCompleted(agentId: string, ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.update({ agentId, id: In(ids), status: 'pending' }, { status: 'completed' });
	}

	async recordCandidateFailure(agentId: string, ids: string[], maxAttempts: number): Promise<void> {
		if (ids.length === 0) return;
		await this.createQueryBuilder()
			.update(AgentMemoryEntryCandidateEntity)
			.set({
				attemptCount: () => '"attemptCount" + 1',
				status: () =>
					"CASE WHEN \"attemptCount\" + 1 >= :maxAttempts THEN 'failed' ELSE 'pending' END",
			})
			.where('"agentId" = :agentId', { agentId })
			.andWhere('"id" IN (:...ids)', { ids })
			.andWhere('"status" = \'pending\'')
			.setParameter('maxAttempts', maxAttempts)
			.execute();
	}
}
