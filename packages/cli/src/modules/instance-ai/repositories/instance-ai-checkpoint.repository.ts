import { isDeepStrictEqual } from 'node:util';

import type { SerializableAgentState } from '@n8n/agents';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan } from '@n8n/typeorm';

import { InstanceAiCheckpoint } from '../entities/instance-ai-checkpoint.entity';

class InstanceAiCheckpointTable extends BaseRepository<InstanceAiCheckpoint> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiCheckpoint, dataSource.manager, transactionRunner);
	}
}

@Service()
export class InstanceAiCheckpointRepository {
	private readonly table: InstanceAiCheckpointTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new InstanceAiCheckpointTable(dataSource, transactionRunner);
	}

	async findByKey(key: string, ctx: OperationContext): Promise<InstanceAiCheckpoint | null> {
		return await this.table.managerFor(ctx).findOne(InstanceAiCheckpoint, { where: { key } });
	}

	async createCheckpoint(
		values: Pick<
			InstanceAiCheckpoint,
			'key' | 'runId' | 'hostRunId' | 'threadId' | 'resourceId' | 'state' | 'expiredAt'
		>,
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.table.managerFor(ctx);
		const checkpoint = manager.create(InstanceAiCheckpoint, values);
		await manager.save(InstanceAiCheckpoint, checkpoint);
	}

	async saveCheckpointChanges(
		checkpoint: InstanceAiCheckpoint,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).save(InstanceAiCheckpoint, checkpoint);
	}

	async markExpiredByKey(key: string, expiredAt: Date, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(InstanceAiCheckpoint, { key }, { expiredAt, state: null });
	}

	async markExpiredOlderThan(olderThan: Date, ctx: OperationContext): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(InstanceAiCheckpoint)
			.set({ expiredAt: new Date(), state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('expiredAt IS NULL')
			.execute();
		return result.affected ?? 0;
	}

	async deleteExpiredOlderThan(olderThan: Date, ctx: OperationContext): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.delete(InstanceAiCheckpoint, { expiredAt: LessThan(olderThan) });
		return result.affected ?? 0;
	}

	/**
	 * Live (non-expired) checkpoints for a thread, newest first. Used to
	 * surface in-flight messages from suspended runs whose `messageList`
	 * hasn't been committed back to `instance_ai_messages` yet. The inbound
	 * user message is persisted on receipt, but the intermediate assistant
	 * responses and pending tool-call from a turn suspended at HITL are only
	 * committed at the end of a successful loop — until the run resumes and
	 * completes, those artifacts live only in the checkpoint blob.
	 */
	async findActiveByThreadId(
		threadId: string,
		ctx: OperationContext,
	): Promise<InstanceAiCheckpoint[]> {
		return await this.table.managerFor(ctx).find(InstanceAiCheckpoint, {
			where: { threadId, expiredAt: IsNull() },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Atomically flip a suspended checkpoint to 'running'. Single-winner across
	 * concurrent resumes (e.g. two mains claiming the same approval): all but
	 * one caller return false. Mirrors the pending-confirmation `claim()`.
	 */
	async claimSuspendedForResume(
		key: string,
		expectedState: SerializableAgentState,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const row = await manager.findOne(InstanceAiCheckpoint, {
				where: { key, expiredAt: IsNull() },
				...(manager.connection.options.type === 'postgres'
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (
				!row?.state ||
				row.state.status !== 'suspended' ||
				!isDeepStrictEqual(row.state, expectedState)
			) {
				return false;
			}

			row.state = { ...row.state, status: 'running' };
			await manager.save(InstanceAiCheckpoint, row);
			return true;
		});
	}

	/**
	 * Find the most recent active (non-expired) checkpoint for a given
	 * resourceId. Sub-agent resourceIds are deterministically derived from the
	 * parent thread and agent kind, so callers can compute the resourceId
	 * without stashing it across suspend/resume cycles.
	 */
	async findActiveByResourceId(
		resourceId: string,
		ctx: OperationContext,
	): Promise<InstanceAiCheckpoint | undefined> {
		const row = await this.table.managerFor(ctx).findOne(InstanceAiCheckpoint, {
			where: { resourceId, expiredAt: IsNull() },
			order: { createdAt: 'DESC' },
		});
		return row ?? undefined;
	}
}
