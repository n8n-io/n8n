import { DatabaseConfig } from '@n8n/config';
import { ScheduledTaskStatus } from '@n8n/constants';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager, type ObjectLiteral } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { PollerState, ScheduledTask } from '../entities';
import { BaseRepository } from './base-repository';
import type { PollerCursor } from '../entities/poller-state';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { dbNowLiteral, laterOfColumnAndNowPlusMsLiteral } from '../utils/dialect-time';

export type { PollerCursor } from '../entities/poller-state';

export type PollLeaseFence = { taskId: string; leaseEpoch: number };

export interface PollerFailureState {
	consecutiveErrors: number;
	backoffUntil: Date | null;
}

@Service()
export class PollerStateRepository extends BaseRepository<PollerState> {
	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		super(PollerState, dataSource.manager, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
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
	 * Advances the stored cursor.
	 *
	 * @param workflowId - Workflow the poll node belongs to.
	 * @param nodeId - Poll trigger node whose cursor is advancing.
	 * @param cursor - New cursor value to store.
	 * @param ctx - Transaction to run the update in.
	 * @param fence - Lease to check before writing. If given and no longer matching,
	 *   the cursor is left untouched.
	 * @returns `true` if the cursor was advanced, `false` if `fence` no longer matches.
	 * @throws {UnexpectedError} when the row is missing, with or without a `fence`, since
	 *   the only explanation left is that the workflow or node was deleted mid-poll.
	 * @remarks Run this in the same transaction as the execution insert for the poll's result,
	 * 	so the two commit or roll back together. If two polls of the same node overlap,
	 * 	the last one to commit wins.
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
			.set({
				cursor,
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<PollerState>)
			.where({ workflowId, nodeId });

		if (fence) {
			const { sql, params } = this.buildFenceClause(manager, fence);
			qb.andWhere(sql, params);
		}

		const result = await qb.execute();
		if (result.affected === 1) {
			return true;
		}

		// The guarded UPDATE alone cannot tell a rejected fence from a missing row, so
		// the failure path re-reads the row to keep the two outcomes distinct.
		if (fence && (await manager.existsBy(PollerState, { workflowId, nodeId }))) {
			return false;
		}

		throw new UnexpectedError('Poller cursor row disappeared while its poll was running', {
			extra: { workflowId, nodeId },
		});
	}

	/**
	 * Removes all stored cursors of the given workflows and returns how many
	 * rows were deleted. Used when durable pollers are refused for the instance:
	 * with the gate closed, a node whose row is gone falls back to its
	 * static-data cursor for good.
	 */
	async deleteWorkflowCursors(workflowIds: string[], ctx: OperationContext = {}): Promise<number> {
		if (workflowIds.length === 0) return 0;
		const result = await this.managerFor(ctx).delete(PollerState, {
			workflowId: In(workflowIds),
		});
		return result.affected ?? 0;
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
	 * Increments the failure counter and pushes the backoff deadline `delayMs` out from
	 * DB-clock now, keeping a stored deadline that already stands further out. Update-only:
	 * an upsert would have to invent a cursor value, seeding `{}` and destroying an
	 * unmigrated node's static-data seed. A missing row is reported as `false`, not thrown.
	 */
	async recordFailure(
		workflowId: string,
		nodeId: string,
		delayMs: number,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(PollerState)
			.set({
				// Both written in SQL rather than read-then-write, so two overlapping
				// failing polls of the same node both count and neither shortens the
				// other's deadline.
				consecutiveErrors: () => '"consecutiveErrors" + 1',
				backoffUntil: () =>
					laterOfColumnAndNowPlusMsLiteral(this.isPostgres, '"backoffUntil"', delayMs),
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<PollerState>)
			.where('workflowId = :workflowId AND nodeId = :nodeId', { workflowId, nodeId })
			.execute();

		return result.affected === 1;
	}

	/**
	 * Zeroes the counter and clears the deadline. Update-only, and guarded on the row
	 * still carrying failures, so an already-clean row is never touched. `false`
	 * therefore means either no row or nothing to clear.
	 */
	async clearFailures(
		workflowId: string,
		nodeId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx)
			.createQueryBuilder()
			.update(PollerState)
			.set({
				consecutiveErrors: 0,
				backoffUntil: null,
				updatedAt: () => dbNowLiteral(this.isPostgres),
			} as QueryDeepPartialEntity<PollerState>)
			.where('workflowId = :workflowId AND nodeId = :nodeId', { workflowId, nodeId })
			.andWhere('("consecutiveErrors" <> 0 OR "backoffUntil" IS NOT NULL)')
			.execute();

		return result.affected === 1;
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
			// A commit may only land while its poll still owns the task (`running`), or
			// right after the task finished well (`succeeded`), since nothing waits on the
			// commit and the status can flip first. Any other status means the poll lost
			// the task, so a commit arriving now is late and must not land.
			.andWhere('fenced_task.status IN (:...fenceAllowedStatuses)')
			.getQuery();

		return {
			sql: `EXISTS ${fenceExists}`,
			params: {
				fenceTaskId: Number(fence.taskId),
				fenceLeaseEpoch: fence.leaseEpoch,
				fenceAllowedStatuses: [ScheduledTaskStatus.Running, ScheduledTaskStatus.Succeeded],
			},
		};
	}
}
