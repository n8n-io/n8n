import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import { isDraftIntegration } from '@n8n/api-types';

import { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import { Agent } from '../entities/agent.entity';
import { isInteractiveChatKind, type AgentQueueDispatch } from '../types/agent-queued-message';

@Service()
export class AgentMessageQueueRepository extends BaseRepository<AgentMessageQueue> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageQueue, dataSource.manager, transactionRunner);
	}

	async enqueue(
		threadId: string,
		messageId: string,
		payload: AgentQueueDispatch,
		ctx: OperationContext,
	) {
		const repository = this.managerFor(ctx).getRepository(AgentMessageQueue);
		const last = await repository.findOne({ where: { threadId }, order: { position: 'DESC' } });
		return await repository.save(
			repository.create({
				threadId,
				messageId,
				position: (last?.position ?? -1) + 1,
				payload,
				executionId: null,
				steeringExecutionId: null,
				steeringOrder: null,
			}),
		);
	}

	async listPending(threadId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).find(AgentMessageQueue, {
			where: { threadId, executionId: IsNull() },
			relations: { message: true },
			order: { position: 'ASC', id: 'ASC' },
		});
	}

	/** Whether the thread has a queued or claimed message, hidden machine turns included. */
	async hasItems(threadId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.managerFor(ctx).existsBy(AgentMessageQueue, { threadId });
	}

	async findItem(threadId: string, id: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(AgentMessageQueue, {
			where: { threadId, id },
			relations: { message: true },
		});
	}

	async movePending(
		threadId: string,
		id: string,
		targetId: string,
		expectedIds: string[],
		ctx: OperationContext,
	): Promise<boolean> {
		const manager = this.managerFor(ctx);
		const items = await manager.find(AgentMessageQueue, {
			where: { threadId, executionId: IsNull(), steeringExecutionId: IsNull() },
			order: { position: 'ASC', id: 'ASC' },
		});
		if (
			items.length !== expectedIds.length ||
			items.some((item, index) => item.id !== expectedIds[index])
		) {
			return false;
		}
		const from = items.findIndex((item) => item.id === id);
		const to = items.findIndex((item) => item.id === targetId);
		const item = items[from];
		if (!item || to < 0 || from === to) return false;
		const start = Math.min(from, to);
		const end = Math.max(from, to);
		// Only one interactive chat kind shares a session, so compare with the moved item.
		if (
			!isInteractiveChatKind(item.payload.kind) ||
			items.slice(start, end + 1).some((entry) => entry.payload.kind !== item.payload.kind)
		)
			return false;

		const reordered = [...items];
		reordered.splice(from, 1);
		reordered.splice(to, 0, item);
		for (let index = start; index <= end; index++) {
			await manager.update(AgentMessageQueue, reordered[index].id, {
				position: items[index].position,
			});
		}
		return true;
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

	async findHead(threadId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(AgentMessageQueue, {
			where: { threadId },
			relations: { message: true },
			order: { position: 'ASC', id: 'ASC' },
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
			relations: { message: true },
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

	async findThreadIds(ctx: OperationContext = {}): Promise<string[]> {
		const rows = await this.managerFor(ctx)
			.createQueryBuilder(AgentMessageQueue, 'queue')
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
