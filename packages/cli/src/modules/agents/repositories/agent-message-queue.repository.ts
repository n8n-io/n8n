import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, Not } from '@n8n/typeorm';
import { isDraftIntegration } from '@n8n/api-types';

import { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import { Agent } from '../entities/agent.entity';
import type { AgentQueuedMessage } from '../types/agent-queued-message';

@Service()
export class AgentMessageQueueRepository extends BaseRepository<AgentMessageQueue> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageQueue, dataSource.manager, transactionRunner);
	}

	async enqueue(
		threadId: string,
		source: string,
		payload: AgentQueuedMessage,
		ctx: OperationContext,
	) {
		const repository = this.managerFor(ctx).getRepository(AgentMessageQueue);
		return await repository.save(
			repository.create({ threadId, source, payload, executionId: null }),
		);
	}

	async findHead(threadId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(AgentMessageQueue, {
			where: { threadId },
			order: { id: 'ASC' },
		});
	}

	async findActive(threadId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOneBy(AgentMessageQueue, {
			threadId,
			executionId: Not(IsNull()),
		});
	}

	async findThreadIds(): Promise<string[]> {
		const rows = await this.createQueryBuilder('queue')
			.select('queue.threadId', 'threadId')
			.distinct(true)
			.getRawMany<{ threadId: string }>();
		return rows.map(({ threadId }) => threadId);
	}

	async linkExecution(
		id: string,
		previousId: string | null,
		executionId: string,
		ctx: OperationContext,
	) {
		const result = await this.managerFor(ctx).update(
			AgentMessageQueue,
			{ id, executionId: previousId ?? IsNull() },
			{ executionId },
		);
		return result.affected === 1;
	}

	async removeActive(threadId: string, executionId: string, ctx: OperationContext) {
		const result = await this.managerFor(ctx).delete(AgentMessageQueue, { threadId, executionId });
		return result.affected === 1;
	}

	async findDeliveryState(id: string) {
		return await this.findOne({ where: { id }, relations: { execution: true } });
	}

	async findPublishedConnection(
		agentId: string,
		projectId: string,
		source: string,
		credentialId: string,
		ctx: OperationContext = {},
	) {
		const agent = await this.managerFor(ctx).findOneBy(Agent, { id: agentId, projectId });
		if (!agent?.activeVersionId) return undefined;
		return agent.integrations?.find(
			(connection) =>
				connection.type === source &&
				connection.credentialId === credentialId &&
				!isDraftIntegration(connection),
		);
	}
}
