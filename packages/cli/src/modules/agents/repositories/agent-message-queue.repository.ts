import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
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
			repository.create({
				threadId,
				source,
				payload,
				executionId: null,
				steeringExecutionId: null,
				steeringOrder: null,
			}),
		);
	}

	async listPending(threadId: string) {
		return await this.find({ where: { threadId, executionId: IsNull() }, order: { id: 'ASC' } });
	}

	async findItem(threadId: string, id: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOneBy(AgentMessageQueue, { threadId, id });
	}

	async removePending(threadId: string, id: string, ctx: OperationContext) {
		const result = await this.managerFor(ctx).delete(AgentMessageQueue, {
			threadId,
			id,
			executionId: IsNull(),
			steeringExecutionId: IsNull(),
		});
		return result.affected === 1;
	}

	async updatePendingPayload(
		threadId: string,
		id: string,
		payload: AgentQueuedMessage,
		ctx: OperationContext,
	) {
		const result = await this.managerFor(ctx).update(
			AgentMessageQueue,
			{ threadId, id, executionId: IsNull(), steeringExecutionId: IsNull() },
			{ payload },
		);
		return result.affected === 1;
	}

	async findHead(threadId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(AgentMessageQueue, {
			where: { threadId },
			order: { id: 'ASC' },
		});
	}

	async reserveSteering(threadId: string, id: string, executionId: string, ctx: OperationContext) {
		const last = await this.managerFor(ctx).findOne(AgentMessageQueue, {
			where: { threadId, steeringExecutionId: executionId },
			order: { steeringOrder: 'DESC' },
		});
		const result = await this.managerFor(ctx).update(
			AgentMessageQueue,
			{ threadId, id, executionId: IsNull(), steeringExecutionId: IsNull() },
			{ steeringExecutionId: executionId, steeringOrder: (last?.steeringOrder ?? 0) + 1 },
		);
		return result.affected === 1;
	}

	async findSteering(threadId: string, executionId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).find(AgentMessageQueue, {
			where: { threadId, executionId: IsNull(), steeringExecutionId: executionId },
			order: { steeringOrder: 'ASC' },
		});
	}

	async findSteeringExecutionIds(threadId: string, ctx: OperationContext): Promise<string[]> {
		const items = await this.managerFor(ctx).find(AgentMessageQueue, {
			select: ['steeringExecutionId'],
			where: { threadId, steeringExecutionId: Not(IsNull()) },
		});
		return [
			...new Set(
				items.flatMap((item) => (item.steeringExecutionId ? [item.steeringExecutionId] : [])),
			),
		];
	}

	async releaseSteering(threadId: string, executionId: string, ctx: OperationContext) {
		const result = await this.managerFor(ctx).update(
			AgentMessageQueue,
			{ threadId, steeringExecutionId: executionId },
			{ steeringExecutionId: null, steeringOrder: null },
		);
		return (result.affected ?? 0) > 0;
	}

	async consumeSteering(
		threadId: string,
		executionId: string,
		ids: string[],
		ctx: OperationContext,
	) {
		if (ids.length === 0) return;
		await this.managerFor(ctx).delete(AgentMessageQueue, {
			threadId,
			steeringExecutionId: executionId,
			executionId: IsNull(),
			id: In(ids),
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
		const agent = await this.managerFor(ctx).findOne(Agent, {
			select: ['integrations', 'activeVersionId'],
			where: { id: agentId, projectId },
		});
		if (!agent?.activeVersionId) return undefined;
		return agent.integrations?.find(
			(connection) =>
				connection.type === source &&
				connection.credentialId === credentialId &&
				!isDraftIntegration(connection),
		);
	}
}
