import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, Not } from '@n8n/typeorm';

import { AgentMessageQueue } from '../entities/agent-message-queue.entity';
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
}
