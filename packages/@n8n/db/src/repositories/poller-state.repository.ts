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
 * A miss on this fence can't tell a reclaimed lease apart from a cursor row
 * that's genuinely gone; both are reported as `null`/`false` by the commit
 * methods that accept a fence, never as an error.
 */
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
	 * mid-poll, and the transaction must not commit. With a `fence`, a miss returns
	 * `false` instead: under at-least-once redelivery, a lease this poll no longer holds
	 * is an expected outcome, not an error. The write is unconditional otherwise, so when
	 * two polls of one node overlap, the last transaction to commit wins.
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
			// Fences on the task's own identity and epoch, not on this row's workflowId/nodeId:
			// it proves the claim hasn't been superseded, not that it belongs to this node. A
			// fence that never reaches this call falls back to the unfenced path rather than
			// blocking every write, so a wiring mistake loses the guard instead of causing
			// data loss.
			const fenceExists = manager
				.createQueryBuilder()
				.subQuery()
				.select('1')
				.from(ScheduledTask, 'fenced_task')
				.where('fenced_task.id = :fenceTaskId')
				.andWhere('fenced_task.leaseEpoch = :fenceLeaseEpoch')
				// Not `status = 'running'`: the emit-path commit is fire-and-forget and can land
				// after the executor already marked the task succeeded, so requiring `running`
				// would drop the cursor advance on an ordinary successful poll. `<> 'pending'`
				// instead: two scheduler paths finish a task without bumping the epoch, fencing
				// on `status` alone, so `leaseEpoch` on its own defends this write less than the
				// scheduler defends its own state.
				.andWhere('fenced_task.status != :fenceExcludedStatus')
				.getQuery();

			// Binding `fence.taskId` through object criteria was tried and reverted: TypeORM's
			// generated parameter names are per-builder, and merging the subquery's parameters
			// into this builder overwrote its own workflowId/nodeId bindings. The raw
			// where-string plus `Number(fence.taskId)` is deliberate.
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

		// A miss here means either a reclaimed lease or a `poller_state` row that's genuinely
		// gone; the two can't be told apart. The EXISTS read takes no lock, so on Postgres a
		// reclaim committing between this statement and our commit still lands (zero window on
		// SQLite, which holds the write lock for the whole transaction). Holds only at the
		// default READ COMMITTED isolation level; a fixed transaction-start snapshot would
		// silently disable it.
		if (fence) return false;

		throw new UnexpectedError('Poller cursor row disappeared while its poll was running', {
			extra: { workflowId, nodeId },
		});
	}
}
