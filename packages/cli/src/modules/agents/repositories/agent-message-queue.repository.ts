import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, Not } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type {
	AgentQueueInput,
	PreviewMessageQueuePayload,
	PreviewSteeringMetadata,
} from '../agent-message-queue.types';
import { AgentMessageQueue } from '../entities/agent-message-queue.entity';

@Service()
export class AgentMessageQueueRepository extends BaseRepository<AgentMessageQueue> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageQueue, dataSource.manager, transactionRunner);
	}

	async enqueue(input: AgentQueueInput): Promise<AgentMessageQueue> {
		return await this.save(
			this.create({
				...input,
				source: input.payload.source,
				kind: input.payload.kind,
				status: 'queued',
				executionId: null,
				steeringRunId: null,
				steeringOrder: null,
			}),
		);
	}

	async findNext(threadId: string): Promise<AgentMessageQueue | null> {
		return await this.createQueryBuilder('item')
			.where('item.threadId = :threadId', { threadId })
			.andWhere(
				'(item.status = :queued OR (item.status = :steering AND item.steeringRunId IS NULL))',
				{ queued: 'queued', steering: 'steering' },
			)
			.orderBy('CASE WHEN item.status = :steering THEN 0 ELSE 1 END', 'ASC')
			.addOrderBy('item.kind', 'ASC')
			.addOrderBy('item.id', 'ASC')
			.setParameter('steering', 'steering')
			.getOne();
	}

	async hasProcessing(threadId: string): Promise<boolean> {
		return await this.existsBy({ threadId, status: In(['processing', 'cancelling']) });
	}

	async hasEntries(threadId: string): Promise<boolean> {
		return await this.existsBy({
			threadId,
			status: In(['queued', 'steering', 'processing', 'cancelling']),
		});
	}

	async markProcessing(id: string): Promise<boolean> {
		const result = await this.createQueryBuilder()
			.update()
			.set({ status: 'processing' })
			.where('id = :id', { id })
			.andWhere('(status = :queued OR (status = :steering AND steeringRunId IS NULL))', {
				queued: 'queued',
				steering: 'steering',
			})
			.execute();
		return result.affected === 1;
	}

	async releaseProcessing(id: string): Promise<void> {
		const entry = await this.findOneBy({ id, status: 'processing' });
		if (!entry) return;
		await this.update(
			{ id, status: 'processing' },
			{ status: entry.steeringOrder !== null ? 'steering' : 'queued' },
		);
	}

	async linkExecution(id: string, executionId: string): Promise<void> {
		await this.update({ id, status: In(['processing', 'cancelling']) }, { executionId });
	}

	async findById(id: string): Promise<AgentMessageQueue | null> {
		return await this.findOneBy({ id });
	}

	async findPreviewEntries(agentId: string, threadId?: string): Promise<AgentMessageQueue[]> {
		return await this.find({
			where: {
				agentId,
				source: 'preview',
				status: Not('delivered'),
				...(threadId ? { threadId } : {}),
			},
			order: { id: 'ASC' },
		});
	}

	async editQueuedPreview(id: string, payload: PreviewMessageQueuePayload): Promise<boolean> {
		return (
			(await this.update({ id, status: 'queued', source: 'preview', kind: 'message' }, { payload }))
				.affected === 1
		);
	}

	async promoteQueued(
		id: string,
		steering: PreviewSteeringMetadata,
		steeringRunId: string | null,
		executionId: string | null = null,
	): Promise<AgentMessageQueue | null> {
		return await this.runInTransaction({}, async (manager) => {
			const claim = await manager.update(
				AgentMessageQueue,
				{ id, status: 'queued', source: 'preview', kind: 'message' },
				{ status: 'steering' },
			);
			if (claim.affected !== 1) return null;

			const entry = await manager.findOneBy(AgentMessageQueue, { id, status: 'steering' });
			if (!entry || entry.payload.source !== 'preview' || entry.payload.kind !== 'message') {
				throw new UnexpectedError('Failed to load the claimed steering message');
			}
			const row = await manager
				.createQueryBuilder(AgentMessageQueue, 'item')
				.select('MAX(item.steeringOrder)', 'value')
				.where('item.threadId = :threadId', { threadId: entry.threadId })
				.getRawOne<{ value: number | string | null }>();
			entry.payload = { ...entry.payload, steering };
			entry.steeringRunId = steeringRunId;
			entry.steeringOrder = Number(row?.value ?? 0) + 1;
			entry.executionId = executionId;
			return await manager.save(AgentMessageQueue, entry);
		});
	}

	async findPendingSteering(threadId: string, runId: string): Promise<AgentMessageQueue[]> {
		return await this.find({
			where: { threadId, status: 'steering', steeringRunId: runId },
			order: { steeringOrder: 'ASC' },
		});
	}

	async findDeliveredSteering(threadId: string): Promise<AgentMessageQueue[]> {
		return await this.find({
			where: { threadId, status: 'delivered' },
			order: { steeringOrder: 'ASC' },
		});
	}

	async requeueUndelivered(id: string, clientRequestId: string): Promise<AgentMessageQueue | null> {
		return await this.runInTransaction({}, async (manager) => {
			const previous = await manager.findOneBy(AgentMessageQueue, { id, status: 'undelivered' });
			if (
				!previous ||
				previous.payload.source !== 'preview' ||
				previous.payload.kind !== 'message' ||
				!previous.payload.steering
			) {
				return null;
			}
			if (previous.payload.steering.requeuedAsId) {
				const entry = await manager.findOneBy(AgentMessageQueue, {
					id: previous.payload.steering.requeuedAsId,
				});
				return entry;
			}

			const { steering: _steering, ...payload } = previous.payload;
			const entry = await manager.save(
				AgentMessageQueue,
				manager.create(AgentMessageQueue, {
					agentId: previous.agentId,
					threadId: previous.threadId,
					source: 'preview',
					kind: 'message',
					status: 'queued',
					payload: { ...payload, clientRequestId },
					executionId: null,
					steeringRunId: null,
					steeringOrder: null,
				}),
			);
			const result = await manager.update(
				AgentMessageQueue,
				{ id, status: 'undelivered' },
				{
					payload: {
						...previous.payload,
						steering: { ...previous.payload.steering, requeuedAsId: entry.id },
					},
				},
			);
			if (result.affected !== 1) throw new UnexpectedError('Failed to save the requeued message');
			return entry;
		});
	}

	async markSteeringDelivered(ids: string[], runId: string, executionId: string): Promise<boolean> {
		if (ids.length === 0) return true;
		return (
			(
				await this.update(
					{ id: In(ids), status: 'steering', steeringRunId: runId },
					{ status: 'delivered', executionId },
				)
			).affected === ids.length
		);
	}

	async markSteeringUndelivered(threadId: string, runId: string, reason: string): Promise<void> {
		for (const entry of await this.findPendingSteering(threadId, runId)) {
			if (
				entry.payload.source !== 'preview' ||
				entry.payload.kind !== 'message' ||
				!entry.payload.steering
			)
				continue;
			await this.update(
				{ id: entry.id, status: 'steering', steeringRunId: runId },
				{
					status: 'undelivered',
					payload: {
						...entry.payload,
						steering: { ...entry.payload.steering, failureReason: reason },
					},
				},
			);
		}
	}

	async markUndelivered(id: string, reason: string): Promise<boolean> {
		const entry = await this.findOneBy({ id, status: 'steering' });
		if (
			!entry ||
			entry.payload.source !== 'preview' ||
			entry.payload.kind !== 'message' ||
			!entry.payload.steering
		) {
			return false;
		}
		return (
			(
				await this.update(
					{ id, status: 'steering' },
					{
						status: 'undelivered',
						payload: {
							...entry.payload,
							steering: { ...entry.payload.steering, failureReason: reason },
						},
					},
				)
			).affected === 1
		);
	}

	async hasParentTurnReservation(threadId: string): Promise<boolean> {
		return await this.existsBy({ threadId, status: 'steering', steeringRunId: IsNull() });
	}

	async requestCancellation(id: string): Promise<boolean> {
		return (
			(
				await this.update(
					{ id, source: 'preview', status: In(['processing', 'cancelling']) },
					{ status: 'cancelling' },
				)
			).affected === 1
		);
	}

	async findLiveEntries(
		ids: string[],
	): Promise<Array<Pick<AgentMessageQueue, 'id' | 'status' | 'payload'>>> {
		if (ids.length === 0) return [];
		return await this.find({ select: ['id', 'status', 'payload'], where: { id: In(ids) } });
	}

	async removeEntry(id: string): Promise<void> {
		await this.delete({ id });
	}

	async finishProcessing(id: string): Promise<boolean> {
		return (await this.delete({ id, status: 'processing' })).affected === 1;
	}

	async cancelQueued(id: string): Promise<boolean> {
		return (await this.delete({ id, status: In(['queued', 'undelivered']) })).affected === 1;
	}

	async cancelWaiting(threadId: string): Promise<void> {
		await this.delete({
			threadId,
			status: In(['queued', 'steering', 'delivered', 'undelivered']),
		});
	}

	async touchLiveEntries(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.update(
			{
				id: In(ids),
				status: In(['queued', 'steering', 'processing', 'delivered', 'undelivered']),
			},
			{ updatedAt: new Date() },
		);
	}

	async findStale(threadId: string, cutoff: Date): Promise<AgentMessageQueue[]> {
		return await this.find({
			where: [
				{ threadId, status: In(['processing', 'cancelling']), updatedAt: LessThan(cutoff) },
				{ threadId, status: 'queued', source: 'preview', updatedAt: LessThan(cutoff) },
				{ threadId, status: 'steering', source: 'preview', updatedAt: LessThan(cutoff) },
			],
		});
	}

	async findStaleThreads(cutoff: Date): Promise<string[]> {
		const rows = await this.createQueryBuilder('item')
			.select('DISTINCT item.threadId', 'threadId')
			.where('item.updatedAt < :cutoff', { cutoff })
			.andWhere(
				'(item.status IN (:...active) OR (item.source = :preview AND item.status IN (:...waiting)))',
				{
					active: ['processing', 'cancelling'],
					preview: 'preview',
					waiting: ['queued', 'steering'],
				},
			)
			.getRawMany<{ threadId: string }>();
		return rows.map(({ threadId }) => threadId);
	}

	async findWaitingThreads(agentId?: string): Promise<string[]> {
		const query = this.createQueryBuilder('item')
			.select('DISTINCT item.threadId', 'threadId')
			.where(
				'(item.status = :queued OR (item.status = :steering AND item.steeringRunId IS NULL))',
				{ queued: 'queued', steering: 'steering' },
			);
		if (agentId !== undefined) query.andWhere('item.agentId = :agentId', { agentId });
		return (await query.getRawMany<{ threadId: string }>()).map(({ threadId }) => threadId);
	}
}
