import type { EpisodicMemoryCaptureKind } from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import { AgentMessageEntity } from '../entities/agent-message.entity';

class AgentMemoryEntryCandidateTable extends BaseRepository<AgentMemoryEntryCandidateEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMemoryEntryCandidateEntity, dataSource.manager, transactionRunner);
	}
}

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
export class AgentMemoryEntryCandidateRepository {
	private readonly table: AgentMemoryEntryCandidateTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentMemoryEntryCandidateTable(dataSource, transactionRunner);
	}

	async enqueueCandidate(
		input: EnqueueCandidateInput,
		ctx: OperationContext,
	): Promise<AgentMemoryEntryCandidateEntity> {
		const manager = this.table.managerFor(ctx);
		const existing = await manager.findOneBy(AgentMemoryEntryCandidateEntity, {
			agentId: input.agentId,
			runId: input.runId,
			toolCallId: input.toolCallId,
		});
		if (existing) return existing;

		const candidate = manager.create(AgentMemoryEntryCandidateEntity, {
			...input,
			status: 'pending',
			attemptCount: 0,
		});
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentMemoryEntryCandidateEntity)
			.values(candidate)
			.orIgnore()
			.execute();

		return await manager.findOneByOrFail(AgentMemoryEntryCandidateEntity, {
			agentId: input.agentId,
			runId: input.runId,
			toolCallId: input.toolCallId,
		});
	}

	async findPendingForResource(
		agentId: string,
		resourceId: string,
		limit: number,
		ctx: OperationContext,
	): Promise<AgentMemoryEntryCandidateEntity[]> {
		return await this.table.managerFor(ctx).find(AgentMemoryEntryCandidateEntity, {
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
		ctx: OperationContext,
	): Promise<AgentMemoryEntryCandidateEntity[]> {
		if (toolCallIds.length === 0) return [];
		return await this.table.managerFor(ctx).findBy(AgentMemoryEntryCandidateEntity, {
			agentId,
			threadId,
			toolCallId: In(toolCallIds),
		});
	}

	/** Resolves each candidate to the message it quoted. Candidates without a stored message are left out. */
	async findSourceMessages(
		agentId: string,
		candidateIds: string[],
		ctx: OperationContext,
	): Promise<Map<string, CandidateSourceMessage>> {
		const sourceMessages = new Map<string, CandidateSourceMessage>();
		if (candidateIds.length === 0) return sourceMessages;
		const manager = this.table.managerFor(ctx);
		const candidates = await manager.find(AgentMemoryEntryCandidateEntity, {
			select: { id: true, sourceMessageId: true },
			where: { agentId, id: In(candidateIds) },
		});
		const messageIds = candidates.flatMap(({ sourceMessageId }) => sourceMessageId ?? []);
		if (messageIds.length === 0) return sourceMessages;
		const messages = await manager.find(AgentMessageEntity, {
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

	async markCandidatesCompleted(
		agentId: string,
		ids: string[],
		ctx: OperationContext,
	): Promise<void> {
		if (ids.length === 0) return;
		await this.table
			.managerFor(ctx)
			.update(
				AgentMemoryEntryCandidateEntity,
				{ agentId, id: In(ids), status: 'pending' },
				{ status: 'completed' },
			);
	}

	async recordCandidateFailure(
		agentId: string,
		ids: string[],
		maxAttempts: number,
		ctx: OperationContext,
	): Promise<void> {
		if (ids.length === 0) return;
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
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
