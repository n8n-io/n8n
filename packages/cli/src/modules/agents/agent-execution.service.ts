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
import { ExecutionThreadRepository } from './repositories/execution-thread.repository';

export interface RecordMessageParams {
	threadId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	userId: string;
	userMessage: string;
	record: MessageRecord;
}

@Service()
export class AgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionMetadataRepository: ExecutionMetadataRepository,
		private readonly executionThreadRepository: ExecutionThreadRepository,
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
		const { created } = await this.executionThreadRepository.findOrCreate(
			threadId,
			agentId,
			agentName,
			projectId,
		);
		if (!created) {
			await this.executionThreadRepository.bumpUpdatedAt(threadId);
		}

		const status = record.error ? 'error' : 'success';
		const startedAt = new Date(record.startTime);
		const stoppedAt = new Date(record.startTime + record.duration);
		const now = new Date();

		const executionId = await this.executionRepository.manager.transaction(async (tx) => {
			// Insert execution entity directly — bypasses the NOT NULL constraint on
			// workflowId by explicitly setting it to NULL in the raw insert.
			const result = await tx
				.createQueryBuilder()
				.insert()
				.into(ExecutionEntity)
				.values({
					finished: true,
					mode: 'agent',
					status,
					createdAt: now,
					startedAt,
					stoppedAt,
					threadId,
					storedAt: 'db',
				} as Partial<ExecutionEntity>)
				.execute();

			const id = String(result.identifiers[0].id);

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

		// Store agent-specific metadata
		const metadata: Array<{ key: string; value: string }> = [
			{ key: 'agentId', value: agentId },
			{ key: 'threadId', value: threadId },
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
		if (record.error) {
			metadata.push({ key: 'error', value: record.error });
		}

		await this.executionMetadataRepository.insert(metadata.map((m) => ({ ...m, executionId })));

		this.logger.debug('Recorded agent execution', {
			executionId,
			threadId,
			agentId,
			status,
			duration: record.duration,
		});

		return executionId;
	}

	/**
	 * Get paginated execution threads for a project.
	 */
	async getThreads(projectId: string, limit: number, cursor?: string) {
		return await this.executionThreadRepository.findByProjectIdPaginated(projectId, limit, cursor);
	}

	/**
	 * Get all executions for a specific thread, ordered by creation time.
	 */
	async getThreadExecutions(threadId: string) {
		return await this.executionRepository.find({
			where: { threadId },
			order: { createdAt: 'ASC' },
			relations: ['metadata'],
		});
	}
}
