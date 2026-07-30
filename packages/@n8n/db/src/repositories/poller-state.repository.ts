import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { PollerState } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

export type PollerCursor = Record<string, unknown>;

export interface VersionedCursor {
	cursor: PollerCursor;
	version: number;
}

@Service()
export class PollerStateRepository extends BaseRepository<PollerState> {
	constructor(dataSource: DataSource) {
		super(PollerState, dataSource.manager);
	}

	/**
	 * A node that has never polled returns `null` rather than an empty cursor: several
	 * poll nodes treat a missing key as "first run" and behave differently from one
	 * that has run and found nothing.
	 */
	async findCursor(
		workflowId: string,
		nodeId: string,
		ctx: OperationContext = {},
	): Promise<VersionedCursor | null> {
		const row = await this.managerFor(ctx).findOne(PollerState, {
			select: ['cursor', 'version'],
			where: { workflowId, nodeId },
		});
		return row === null ? null : { cursor: row.cursor, version: row.version };
	}

	/**
	 * The node's cursor, creating the row from `initial` if it has none.
	 *
	 * Returns what the database holds, which is not always `initial`: two processes can
	 * reach a node's first poll at once, and the loser must continue from the cursor the
	 * winner stored rather than from its own starting value.
	 */
	async ensureCursor(
		workflowId: string,
		nodeId: string,
		initial: PollerCursor,
		ctx: OperationContext,
	): Promise<VersionedCursor> {
		const manager = this.managerFor(ctx);

		await manager
			.createQueryBuilder()
			.insert()
			.into(PollerState)
			.values({ workflowId, nodeId, cursor: initial } as QueryDeepPartialEntity<PollerState>)
			.orIgnore()
			.execute();

		const row = await manager.findOneOrFail(PollerState, {
			select: ['cursor', 'version'],
			where: { workflowId, nodeId },
		});
		return { cursor: row.cursor, version: row.version };
	}

	/**
	 * Move the cursor of an existing row, on the condition that it is still at
	 * `expectedVersion` — the version read before `poll()` ran.
	 *
	 * Call inside the transaction that also inserts the execution the poll produced, so
	 * neither can commit without the other. Throws when no row matched: either the
	 * workflow or node went away mid-poll, or another poll of the same node committed
	 * first and moved the version on — the scheduler documents that a poll occurrence
	 * can run twice, and this is what stops the loser from overwriting the winner's
	 * cursor or creating a duplicate execution.
	 */
	async advanceCursor(
		workflowId: string,
		nodeId: string,
		cursor: PollerCursor,
		expectedVersion: number,
		ctx: OperationContext,
	): Promise<void> {
		// TypeORM's QueryDeepPartialEntity doesn't accept `Record<string, unknown>`, so the
		// well-typed value is cast at this boundary.
		const result = await this.managerFor(ctx).update(
			PollerState,
			{ workflowId, nodeId, version: expectedVersion },
			{
				cursor,
				version: expectedVersion + 1,
				updatedAt: new Date(),
			} as QueryDeepPartialEntity<PollerState>,
		);

		// `affected` is optional in TypeORM and not reported by every driver, so anything
		// other than a definite single row is treated as a miss.
		if (result.affected !== 1) {
			throw new UnexpectedError(
				'Poller cursor row disappeared or was advanced by a concurrent poll',
				{ extra: { workflowId, nodeId, expectedVersion } },
			);
		}
	}

	async deleteNode(workflowId: string, nodeId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(PollerState, { workflowId, nodeId });
	}

	async deleteByWorkflowId(workflowId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(PollerState, { workflowId });
	}
}
