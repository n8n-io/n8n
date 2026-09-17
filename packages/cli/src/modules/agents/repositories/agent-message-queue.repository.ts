import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { conversationDbTime } from './agent-conversation-lease.repository';

import type { AgentQueueInput } from '../agent-message-queue.types';
import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import { AgentMessageQueue } from '../entities/agent-message-queue.entity';

@Service()
export class AgentMessageQueueRepository extends BaseRepository<AgentMessageQueue> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageQueue, dataSource.manager, transactionRunner);
	}

	private time(offsetMs = 0): string {
		return conversationDbTime(this.manager.connection.options.type === 'postgres', offsetMs);
	}

	async findById(id: string, ctx: OperationContext): Promise<AgentMessageQueue | null> {
		return await this.managerFor(ctx).findOneBy(AgentMessageQueue, { id });
	}

	async enqueue(input: AgentQueueInput): Promise<AgentMessageQueue> {
		return await this.save(
			this.create({
				...input,
				source: input.payload.source,
				kind: input.payload.kind,
				status: 'queued',
				executionId: null,
			}),
		);
	}

	async findNext(threadId: string): Promise<AgentMessageQueue | null> {
		return await this.findOne({
			where: { threadId, status: 'queued' },
			// The two kinds sort as HITL, then ordinary messages.
			order: { kind: 'ASC', id: 'ASC' },
		});
	}

	async hasProcessing(threadId: string): Promise<boolean> {
		return await this.existsBy({ threadId, status: 'processing' });
	}

	async hasEntries(threadId: string): Promise<boolean> {
		return await this.existsBy({ threadId });
	}

	async markProcessing(id: string, ctx: OperationContext): Promise<boolean> {
		return (
			(
				await this.managerFor(ctx).update(
					AgentMessageQueue,
					{ id, status: 'queued' },
					{
						status: 'processing',
						updatedAt: () => this.time(),
					},
				)
			).affected === 1
		);
	}

	async linkExecution(id: string, executionId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).update(
			AgentMessageQueue,
			{ id, status: 'processing' },
			{ executionId },
		);
	}

	async removeEntry(id: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(AgentMessageQueue, { id });
	}

	async removeStale(
		id: string,
		graceMs: number,
		attachmentIds: string[],
		ctx: OperationContext,
	): Promise<Array<Pick<AgentChatAttachment, 'id' | 'binaryDataId'>> | null> {
		const manager = this.managerFor(ctx);
		const deleted = await manager
			.createQueryBuilder()
			.delete()
			.from(AgentMessageQueue)
			.where({ id })
			.andWhere(`"updatedAt" < ${this.time(-graceMs)}`)
			.execute();
		if (deleted.affected !== 1) return null;
		if (attachmentIds.length === 0) return [];

		const attachments = await manager.find(AgentChatAttachment, {
			select: { id: true, binaryDataId: true },
			where: { id: In(attachmentIds) },
		});
		await manager.delete(AgentChatAttachment, { id: In(attachmentIds) });
		return attachments;
	}

	async cancelQueued(id: string): Promise<boolean> {
		return (await this.delete({ id, status: 'queued' })).affected === 1;
	}

	async cancelWaiting(threadId: string): Promise<void> {
		await this.delete({ threadId, status: 'queued' });
	}

	async touchLiveEntries(ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];
		await this.update({ id: In(ids), status: 'queued' }, { updatedAt: () => this.time() });
		return await this.findExistingIds(ids);
	}

	async touchProcessing(id: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).update(
			AgentMessageQueue,
			{ id, status: 'processing' },
			{
				updatedAt: () => this.time(),
			},
		);
	}

	async findExistingIds(ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];
		const rows = await this.find({ select: ['id'], where: { id: In(ids) } });
		return rows.map(({ id }) => id);
	}

	async findStale(threadId: string, graceMs: number): Promise<AgentMessageQueue[]> {
		return await this.createQueryBuilder('item')
			.where({ threadId })
			.andWhere(`item.updatedAt < ${this.time(-graceMs)}`)
			.andWhere(
				'(item.status = :processing OR (item.status = :queued AND item.source = :preview))',
				{
					processing: 'processing',
					queued: 'queued',
					preview: 'preview',
				},
			)
			.getMany();
	}

	async findStaleConversations(
		graceMs: number,
	): Promise<Array<{ agentId: string; threadId: string }>> {
		return await this.createQueryBuilder('item')
			.select('item.agentId', 'agentId')
			.addSelect('item.threadId', 'threadId')
			.distinct(true)
			.where(`item.updatedAt < ${this.time(-graceMs)}`)
			.andWhere('(item.status = :processing OR item.source = :preview)', {
				processing: 'processing',
				preview: 'preview',
			})
			.getRawMany<{ agentId: string; threadId: string }>();
	}

	async findWaitingThreads(agentId?: string): Promise<string[]> {
		const query = this.createQueryBuilder('item')
			.select('DISTINCT item.threadId', 'threadId')
			.where('item.status = :status', { status: 'queued' });
		if (agentId !== undefined) query.andWhere('item.agentId = :agentId', { agentId });
		return (await query.getRawMany<{ threadId: string }>()).map(({ threadId }) => threadId);
	}
}
