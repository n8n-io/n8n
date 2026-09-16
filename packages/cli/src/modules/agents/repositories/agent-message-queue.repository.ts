import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Repository } from '@n8n/typeorm';

import type { AgentQueueInput } from '../agent-message-queue.types';
import { AgentMessageQueue } from '../entities/agent-message-queue.entity';

@Service()
export class AgentMessageQueueRepository extends Repository<AgentMessageQueue> {
	constructor(dataSource: DataSource) {
		super(AgentMessageQueue, dataSource.manager);
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

	async markProcessing(id: string): Promise<boolean> {
		return (await this.update({ id, status: 'queued' }, { status: 'processing' })).affected === 1;
	}

	async linkExecution(id: string, executionId: string): Promise<void> {
		await this.update({ id, status: 'processing' }, { executionId });
	}

	async removeEntry(id: string): Promise<void> {
		await this.delete({ id });
	}

	async cancelQueued(id: string): Promise<boolean> {
		return (await this.delete({ id, status: 'queued' })).affected === 1;
	}

	async cancelWaiting(threadId: string): Promise<void> {
		await this.delete({ threadId, status: 'queued' });
	}

	async touchLiveEntries(ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];
		await this.update({ id: In(ids) }, { updatedAt: new Date() });
		return await this.findExistingIds(ids);
	}

	async findExistingIds(ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];
		const rows = await this.find({ select: ['id'], where: { id: In(ids) } });
		return rows.map(({ id }) => id);
	}

	async findStale(threadId: string, cutoff: Date): Promise<AgentMessageQueue[]> {
		return await this.find({
			where: [
				{ threadId, status: 'processing', updatedAt: LessThan(cutoff) },
				{ threadId, status: 'queued', source: 'preview', updatedAt: LessThan(cutoff) },
			],
		});
	}

	async findStaleThreads(cutoff: Date): Promise<string[]> {
		const rows = await this.createQueryBuilder('item')
			.select('DISTINCT item.threadId', 'threadId')
			.where('item.updatedAt < :cutoff', { cutoff })
			.andWhere('(item.status = :processing OR item.source = :preview)', {
				processing: 'processing',
				preview: 'preview',
			})
			.getRawMany<{ threadId: string }>();
		return rows.map(({ threadId }) => threadId);
	}

	async findWaitingThreads(agentId?: string): Promise<string[]> {
		const query = this.createQueryBuilder('item')
			.select('DISTINCT item.threadId', 'threadId')
			.where('item.status = :status', { status: 'queued' });
		if (agentId !== undefined) query.andWhere('item.agentId = :agentId', { agentId });
		return (await query.getRawMany<{ threadId: string }>()).map(({ threadId }) => threadId);
	}
}
