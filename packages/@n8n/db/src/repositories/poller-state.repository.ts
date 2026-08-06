import { ScheduledTaskStatus } from '@n8n/constants';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager, type ObjectLiteral } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { PollerState, ScheduledTask } from '../entities';
import { BaseRepository } from './base-repository';
import type { PollerCursor } from '../entities/poller-state';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

export type { PollerCursor } from '../entities/poller-state';

export type PollLeaseFence = { taskId: string; leaseEpoch: number };

@Service()
export class PollerStateRepository extends BaseRepository<PollerState> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PollerState, dataSource.manager, transactionRunner);
	}

	/** The node's stored cursor, or `null` if it has never polled. */
	async findCursor(
		workflowId: string,
		nodeId: string,
		ctx: OperationContext = {},
	): Promise<PollerCursor | null> {
		const row = await this.managerFor(ctx).findOne(PollerState, {
			select: ['cursor'],
			where: { workflowId, nodeId },
		});
		return row === null ? null : row.cursor;
	}

	/**
	 * Returns the node's cursor, seeding it with `initial` on first read. Reads first
	 * so a node past its first poll costs one query, not two; on a miss, racing
	 * processes both try to insert, and the loser re-reads the winner's stored cursor.
	 */
	async getOrCreateCursor(
		workflowId: string,
		nodeId: string,
		initial: PollerCursor,
		ctx: OperationContext,
	): Promise<PollerCursor> {
		const manager = this.managerFor(ctx);

		const existing = await manager.findOne(PollerState, {
			select: ['cursor'],
			where: { workflowId, nodeId },
		});
		if (existing !== null) return existing.cursor;

		await manager
			.createQueryBuilder()
			.insert()
			.into(PollerState)
			.values({ workflowId, nodeId, cursor: initial } as QueryDeepPartialEntity<PollerState>)
			.orIgnore()
			.execute();

		const row = await manager.findOneOrFail(PollerState, {
			select: ['cursor'],
			where: { workflowId, nodeId },
		});
		return row.cursor;
	}

	/**
	 * Call inside the transaction that also inserts the execution the poll produced, so
	 * neither commits without the other. Without a `fence`, throws if no row matched: the
	 * row was read before `poll()` ran, so a miss means the workflow or node was removed
	 * mid-poll. With a `fence`, a miss returns `false` instead. The write is unconditional
	 * otherwise, so when two polls of one node overlap, the last transaction to commit wins.
	 */
	async advanceCursor(
		workflowId: string,
		nodeId: string,
		cursor: PollerCursor,
		ctx: OperationContext,
		fence?: PollLeaseFence,
	): Promise<boolean> {
		const manager = this.managerFor(ctx);

		// QueryDeepPartialEntity rejects `Record<string, unknown>`, so cast at this boundary.
		const qb = manager
			.createQueryBuilder()
			.update(PollerState)
			.set({ cursor, updatedAt: new Date() } as QueryDeepPartialEntity<PollerState>)
			.where({ workflowId, nodeId });

		if (fence) {
			const { sql, params } = this.buildFenceClause(manager, fence);
			qb.andWhere(sql, params);
		}

		const result = await qb.execute();

		// `affected` is typed optional, though both supported drivers populate it; only
		// an exact single-row match counts as success.
		if (result.affected === 1) return true;

		if (fence) return false;

		throw new UnexpectedError('Poller cursor row disappeared while its poll was running', {
			extra: { workflowId, nodeId },
		});
	}

	private buildFenceClause(
		manager: EntityManager,
		fence: PollLeaseFence,
	): { sql: string; params: ObjectLiteral } {
		const fenceExists = manager
			.createQueryBuilder()
			.subQuery()
			.select('1')
			.from(ScheduledTask, 'fenced_task')
			.where('fenced_task.id = :fenceTaskId')
			.andWhere('fenced_task.leaseEpoch = :fenceLeaseEpoch')
			// `<> 'pending'`, not `= 'running'`: a fire-and-forget commit can land after
			// the task already succeeded, and only a pending task's lease can be reclaimed.
			.andWhere('fenced_task.status != :fenceExcludedStatus')
			.getQuery();

		return {
			sql: `EXISTS ${fenceExists}`,
			params: {
				fenceTaskId: Number(fence.taskId),
				fenceLeaseEpoch: fence.leaseEpoch,
				fenceExcludedStatus: ScheduledTaskStatus.Pending,
			},
		};
	}
}
