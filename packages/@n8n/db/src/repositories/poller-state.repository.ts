import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { PollerState } from '../entities';
import { BaseRepository } from './base-repository';
import type { PollerCursor } from '../entities/poller-state';
import type { OperationContext } from '../services/transaction';

export type { PollerCursor } from '../entities/poller-state';

@Service()
export class PollerStateRepository extends BaseRepository<PollerState> {
	constructor(dataSource: DataSource) {
		super(PollerState, dataSource.manager);
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
	): Promise<PollerCursor> {
		const manager = this.managerFor(ctx);

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
	 * Move the cursor of an existing row.
	 *
	 * Call inside the transaction that also inserts the execution the poll produced, so
	 * neither can commit without the other. Throws when no row matched: the row was read
	 * before `poll()` ran, so its absence means the workflow or node went away mid-poll
	 * and the surrounding transaction must not commit.
	 */
	async advanceCursor(
		workflowId: string,
		nodeId: string,
		cursor: PollerCursor,
		ctx: OperationContext,
	): Promise<void> {
		// TypeORM's QueryDeepPartialEntity doesn't accept `Record<string, unknown>`, so the
		// well-typed value is cast at this boundary.
		const result = await this.managerFor(ctx).update(PollerState, { workflowId, nodeId }, {
			cursor,
			updatedAt: new Date(),
		} as QueryDeepPartialEntity<PollerState>);

		// `affected` is optional in TypeORM and not reported by every driver, so anything
		// other than a definite single row is treated as a miss.
		if (result.affected !== 1) {
			throw new UnexpectedError('Poller cursor row disappeared while its poll was running', {
				extra: { workflowId, nodeId },
			});
		}
	}
}
