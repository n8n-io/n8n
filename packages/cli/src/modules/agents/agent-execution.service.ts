import { Logger } from '@n8n/backend-common';
import {
	ExecutionData,
	ExecutionEntity,
	ExecutionRepository,
	ExecutionMetadataRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import type { MessageRecord } from './execution-recorder';
import { N8nMemory } from './integrations/n8n-memory';
import { ExecutionThread } from './entities/execution-thread.entity';
import { ExecutionThreadRepository } from './repositories/execution-thread.repository';

export interface RecordMessageParams {
	threadId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	userId: string;
	userMessage: string;
	record: MessageRecord;
	/** Set to 'suspended' or 'resumed' for HITL tool call flows. */
	hitlStatus?: 'suspended' | 'resumed';
	/** Where the message originated from, e.g. 'chat', 'slack'. */
	source?: string;
}

@Service()
export class AgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionMetadataRepository: ExecutionMetadataRepository,
		private readonly executionThreadRepository: ExecutionThreadRepository,
		private readonly n8nMemory: N8nMemory,
	) {}

	/**
	 * Record a single agent message as an execution.
	 * Creates or updates the thread, creates the execution record, and stores metadata.
	 *
	 * Inserts directly via the repository manager rather than ExecutionPersistence
	 * because execution_entity.workflowId has a NOT NULL + FK constraint to
	 * workflow_entity, and agent executions have no associated workflow.
	 * Raw SQL lets us insert with workflowId = NULL.
	 */
	async recordMessage(params: RecordMessageParams): Promise<string> {
		const { threadId, agentId, agentName, projectId, record } = params;

		// Ensure the thread exists and bump its updatedAt
		const { thread, created } = await this.executionThreadRepository.findOrCreate(
			threadId,
			agentId,
			agentName,
			projectId,
		);
		if (!created) {
			await this.executionThreadRepository.bumpUpdatedAt(threadId);
			// Sync title from the SDK memory thread if we don't have one yet
			if (!thread.title) {
				await this.syncTitleFromMemory(threadId);
			}
		}

		const status = record.error ? 'error' : 'success';
		const startedAt = new Date(record.startTime);
		const stoppedAt = new Date(record.startTime + record.duration);
		const now = new Date();

		const executionId = await this.executionRepository.manager.transaction(async (tx) => {
			// Use tx.insert with the entity class. The workflowId column is NOT NULL
			// in the DB but nullable in the entity — TypeORM's insert() handles this
			// correctly by omitting unset fields from the INSERT statement.
			const { identifiers } = await tx.insert(ExecutionEntity, {
				finished: true,
				mode: 'agent',
				status,
				createdAt: now,
				startedAt,
				stoppedAt,
				threadId,
				storedAt: 'db' as const,
			});

			const id = String(identifiers[0].id);

			await tx.insert(ExecutionData, {
				executionId: id,
				workflowData: {
					id: agentId,
					name: agentName,
					nodes: [],
					connections: {},
					settings: {},
				},
				data: stringify(createEmptyRunExecutionData()),
			});

			return id;
		});

		// Replace platform mentions (e.g. Slack's <@U0ANB4K6611> or plain @U0ANB4K6611)
		const cleanedMessage = params.userMessage
			.replace(/<@[A-Z0-9]+>/gi, `@${agentName}`)
			.replace(/@[A-Z0-9]{8,}/gi, `@${agentName}`)
			.trim();

		// Store agent-specific metadata
		const metadata: Array<{ key: string; value: string }> = [
			{ key: 'agentId', value: agentId },
			{ key: 'threadId', value: threadId },
			{ key: 'userMessage', value: cleanedMessage },
			{ key: 'assistantResponse', value: record.assistantResponse },
		];

		if (record.model) {
			metadata.push({ key: 'model', value: record.model });
		}
		if (record.usage) {
			metadata.push({ key: 'promptTokens', value: String(record.usage.promptTokens) });
			metadata.push({ key: 'completionTokens', value: String(record.usage.completionTokens) });
			metadata.push({ key: 'totalTokens', value: String(record.usage.totalTokens) });
		}
		if (record.totalCost !== null) {
			metadata.push({ key: 'cost', value: String(record.totalCost) });
		}
		if (record.toolCalls.length > 0) {
			metadata.push({ key: 'toolCalls', value: JSON.stringify(record.toolCalls) });
		}
		if (record.timeline.length > 0) {
			metadata.push({ key: 'timeline', value: JSON.stringify(record.timeline) });
		}
		if (record.error) {
			metadata.push({ key: 'error', value: record.error });
		}
		if (params.hitlStatus) {
			metadata.push({ key: 'hitlStatus', value: params.hitlStatus });
		}
		if (record.workingMemory) {
			metadata.push({ key: 'workingMemory', value: record.workingMemory });
		}
		if (params.source) {
			metadata.push({ key: 'source', value: params.source });
		}

		await this.executionMetadataRepository.insert(metadata.map((m) => ({ ...m, executionId })));

		// When a resumed execution completes with usage data, backfill any
		// preceding suspended executions in the same thread that are missing it.
		if (params.hitlStatus === 'resumed' && record.model) {
			await this.backfillSuspendedExecutions(threadId, record);
		}

		// Atomically increment token/cost/duration counters on the thread
		if (record.usage) {
			await this.executionThreadRepository.incrementUsage(
				threadId,
				record.usage.promptTokens,
				record.usage.completionTokens,
				record.totalCost ?? 0,
				record.duration,
			);
		}

		this.logger.debug('Recorded agent execution', {
			executionId,
			threadId,
			agentId,
			status,
			duration: record.duration,
		});

		// Title generation now runs synchronously (sync: true) before the stream
		// ends, so by this point the memory thread should have the title.
		// Sync it to our execution thread on the first message.
		if (created) {
			await this.syncTitleFromMemory(threadId);
		}

		return executionId;
	}

	/**
	 * Backfill model info on suspended executions in a thread that are missing it.
	 * Called when a resumed execution completes — the model applies to the whole cycle.
	 */
	private async backfillSuspendedExecutions(threadId: string, record: MessageRecord) {
		// Find executions in this thread that have hitlStatus=suspended but no model
		const suspendedExecutions = await this.executionRepository.find({
			where: { threadId },
			relations: ['metadata'],
		});

		for (const exec of suspendedExecutions) {
			const hasSuspended = exec.metadata.some(
				(m) => m.key === 'hitlStatus' && m.value === 'suspended',
			);
			const hasModel = exec.metadata.some((m) => m.key === 'model');
			if (!hasSuspended || hasModel) continue;

			const backfill: Array<{ key: string; value: string }> = [];
			if (record.model) {
				backfill.push({ key: 'model', value: record.model });
			}
			if (backfill.length > 0) {
				await this.executionMetadataRepository.insert(
					backfill.map((m) => ({ ...m, executionId: exec.id })),
				);
			}
		}
	}

	/**
	 * Try to read the title from the SDK memory thread and sync it to our execution thread.
	 * The SDK's titleGeneration runs fire-and-forget after the first message,
	 * so the title is typically available by the second message.
	 */
	private async syncTitleFromMemory(threadId: string): Promise<void> {
		try {
			const memoryThread = await this.n8nMemory.getThread(threadId);
			if (memoryThread?.title) {
				const emoji =
					memoryThread.metadata && typeof memoryThread.metadata.emoji === 'string'
						? memoryThread.metadata.emoji
						: null;
				await this.executionThreadRepository.update(threadId, {
					title: memoryThread.title,
					...(emoji && { emoji }),
				});
			}
		} catch {
			// Memory thread may not exist (agent without memory configured) — ignore
		}
	}

	/**
	 * Delete a thread and all its associated executions.
	 * No FK cascade exists on execution_entity.threadId, so we delete explicitly.
	 */
	async deleteThread(projectId: string, threadId: string): Promise<boolean> {
		// Verify ownership before deleting anything
		const thread = await this.executionThreadRepository.findOneBy({ id: threadId, projectId });
		if (!thread) return false;

		await this.executionRepository.delete({ threadId });
		await this.executionThreadRepository.delete({ id: threadId });
		return true;
	}

	/**
	 * Get paginated execution threads for a project.
	 * Optionally filtered by agentId.
	 */
	async getThreads(projectId: string, limit: number, cursor?: string, agentId?: string) {
		const page = await this.executionThreadRepository.findByProjectIdPaginated(
			projectId,
			limit,
			cursor,
			agentId,
		);

		if (page.threads.length === 0) return page;

		// Fetch the first userMessage for each thread in a single query.
		// Uses a correlated subquery to get the lowest executionId per thread.
		const threadIds = page.threads.map((t) => t.id);
		const firstMessages = await this.executionMetadataRepository
			.createQueryBuilder('m')
			.innerJoin('execution_entity', 'e', 'e.id = m.executionId')
			.select(['e.threadId AS threadId', 'm.value AS value'])
			.where('e.threadId IN (:...threadIds)', { threadIds })
			.andWhere("m.key = 'userMessage'")
			.andWhere("m.value != ''")
			.andWhere(
				'e.id = (SELECT MIN(e2.id) FROM execution_entity e2 ' +
					'INNER JOIN execution_metadata m2 ON m2.executionId = e2.id ' +
					"WHERE e2.threadId = e.threadId AND m2.key = 'userMessage' AND m2.value != '')",
			)
			.getRawMany<{ threadId: string; value: string }>();

		const messageMap = new Map(firstMessages.map((r) => [r.threadId, r.value]));

		return {
			...page,
			threads: page.threads.map((t) => ({
				...t,
				firstMessage: messageMap.get(t.id) ?? null,
			})),
		};
	}

	/**
	 * Get a thread with all its executions.
	 * Validates projectId ownership. Optionally validates agentId.
	 * Returns the thread aggregate + executions with metadata.
	 */
	async getThreadDetail(threadId: string, projectId: string, agentId?: string) {
		const thread = await this.executionThreadRepository.findOneBy({ id: threadId });
		if (!thread || !threadBelongsTo(thread, projectId, agentId)) return null;

		const executions = await this.executionRepository.find({
			where: { threadId },
			order: { createdAt: 'ASC' },
			relations: ['metadata'],
		});

		return { thread, executions };
	}

	/**
	 * Fetch a thread by id without scoping. Callers accepting a client-supplied
	 * threadId MUST verify ownership with {@link threadBelongsTo} before use to
	 * prevent IDOR.
	 */
	async findThreadById(threadId: string): Promise<ExecutionThread | null> {
		return await this.executionThreadRepository.findOneBy({ id: threadId });
	}
}

/**
 * True if `thread` belongs to the given project (and optionally agent).
 * Returns false for threads from a different project/agent so the caller can
 * reject the request instead of leaking/modifying unrelated thread data.
 */
export function threadBelongsTo(
	thread: ExecutionThread,
	projectId: string,
	agentId?: string,
): boolean {
	if (thread.projectId !== projectId) return false;
	if (agentId && thread.agentId !== agentId) return false;
	return true;
}
