import { ScheduledTaskStatus } from '@n8n/constants';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { PollerState, ScheduledTask } from '../entities';
import { BaseRepository } from './base-repository';
import type { PollerCursor } from '../entities/poller-state';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';

export type { PollerCursor } from '../entities/poller-state';

/**
 * A fence miss can't tell a reclaimed lease apart from a cursor row that's
 * genuinely gone, so the commit methods that accept a fence report it as
 * `null`/`false`, never as an error.
 */
export type PollLeaseFence = { taskId: string; leaseEpoch: number };

@Service()
export class PollerStateRepository extends BaseRepository<PollerState> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PollerState, dataSource.manager, transactionRunner);
	}

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
	 * so a node past its first poll costs one query, not two; on a miss, the loser of
	 * a racing insert re-reads the winner's stored cursor.
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
	 * neither commits without the other. Without a `fence`, throws on a miss: the row
	 * was read before `poll()` ran, so a miss means the workflow or node was removed
	 * mid-poll. With a `fence`, a miss returns `false` instead: under at-least-once
	 * redelivery, a lease this poll no longer holds is expected, not an error.
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
			// A missing fence falls back to the unfenced write rather than blocking every
			// call, so a wiring mistake loses the guard instead of causing data loss.
			const fenceExists = manager
				.createQueryBuilder()
				.subQuery()
				.select('1')
				.from(ScheduledTask, 'fenced_task')
				.where('fenced_task.id = :fenceTaskId')
				.andWhere('fenced_task.leaseEpoch = :fenceLeaseEpoch')
				// Not `status = 'running'`: the emit-path commit is fire-and-forget and can land
				// after the executor already marked the task succeeded, which would drop an
				// ordinary successful poll's cursor advance. `<> 'pending'` instead: only a
				// pending task can still have its lease reclaimed by another worker.
				.andWhere('fenced_task.status != :fenceExcludedStatus')
				.getQuery();

			// Binding via object criteria was tried and reverted: TypeORM's generated
			// parameter names are per-builder, and merging the subquery's parameters into
			// this builder overwrote its own workflowId/nodeId bindings.
			qb.andWhere(`EXISTS ${fenceExists}`, {
				fenceTaskId: Number(fence.taskId),
				fenceLeaseEpoch: fence.leaseEpoch,
				fenceExcludedStatus: ScheduledTaskStatus.Pending,
			});
		}

		const result = await qb.execute();

		// `affected` is optional and not reported by every driver, so only an exact
		// single-row match counts as success.
		if (result.affected === 1) return true;

		// The EXISTS read takes no lock, so on Postgres a reclaim committing between this
		// statement and our commit still lands (zero window on SQLite, which holds the
		// write lock for the whole transaction). Holds only at READ COMMITTED; a fixed
		// transaction-start snapshot would silently disable it.
		if (fence) return false;

		throw new UnexpectedError('Poller cursor row disappeared while its poll was running', {
			extra: { workflowId, nodeId },
		});
	}
}
