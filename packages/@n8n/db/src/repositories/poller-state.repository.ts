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

/** A fence miss can't tell a reclaimed lease apart from a genuinely gone cursor row. */
export type PollLeaseFence = { taskId: string; leaseEpoch: number };

export interface PollerFailureState {
	consecutiveErrors: number;
	backoffUntil: Date | null;
}

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
	 * Call inside the transaction that also inserts the poll's execution, so neither commits
	 * without the other. Without a `fence`, a miss throws (the workflow/node was removed
	 * mid-poll); with one, a miss returns `false` instead.
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

			// Binding via object criteria was reverted: TypeORM's per-builder parameter
			// names made the subquery's binding overwrite this builder's own.
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

		if (fence) return false;

		throw new UnexpectedError('Poller cursor row disappeared while its poll was running', {
			extra: { workflowId, nodeId },
		});
	}

	/** The node's failure counters, or `null` if it has no stored row. */
	async findFailureState(
		workflowId: string,
		nodeId: string,
		ctx: OperationContext = {},
	): Promise<PollerFailureState | null> {
		const row = await this.managerFor(ctx).findOne(PollerState, {
			select: ['consecutiveErrors', 'backoffUntil'],
			where: { workflowId, nodeId },
		});
		return row === null
			? null
			: { consecutiveErrors: row.consecutiveErrors, backoffUntil: row.backoffUntil };
	}

	/**
	 * Increments the failure counter and sets the backoff deadline. Update-only: an upsert
	 * would have to invent a cursor value, seeding `{}` and destroying an unmigrated node's
	 * static-data seed. A missing row is reported as `false`, not thrown.
	 */
	async recordFailure(
		workflowId: string,
		nodeId: string,
		backoffUntil: Date,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(PollerState)
			.set({
				// Incremented in SQL rather than read-then-write, so two overlapping
				// failing polls of the same node both count instead of one clobbering
				// the other.
				consecutiveErrors: () => '"consecutiveErrors" + 1',
				backoffUntil,
				updatedAt: new Date(),
			} as QueryDeepPartialEntity<PollerState>)
			.where('workflowId = :workflowId AND nodeId = :nodeId', { workflowId, nodeId })
			.execute();

		return result.affected === 1;
	}

	/** Zeroes the counter and clears the deadline. Update-only, same `false` on a miss. */
	async clearFailures(
		workflowId: string,
		nodeId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(PollerState, { workflowId, nodeId }, {
			consecutiveErrors: 0,
			backoffUntil: null,
			updatedAt: new Date(),
		} as QueryDeepPartialEntity<PollerState>);

		return result.affected === 1;
	}
}
