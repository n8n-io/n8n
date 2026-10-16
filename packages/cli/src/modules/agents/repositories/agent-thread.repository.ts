import { BaseRepository, TransactionRunner } from '@n8n/db';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';

/** Column values that a thread patch can write. `undefined` keeps the stored value. */
export interface AgentThreadRowPatch {
	title?: string | null;
	metadata?: string | null;
}

@Service()
export class AgentThreadRepository extends BaseRepository<AgentThreadEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadEntity, dataSource.manager, transactionRunner);
	}

	/**
	 * Read, update and write the title and metadata of one thread in one
	 * transaction. On Postgres the row stays locked until the write, so
	 * concurrent patches from different mains cannot lose an update. On SQLite
	 * (single main only) each transaction holds the single write connection
	 * until it commits, so patches already run one after another.
	 *
	 * `update` gets the locked row and returns the columns to write. When it
	 * returns `null` or `undefined`, nothing is written and the row is returned
	 * as it is. Returns `null` when the thread does not exist.
	 */
	async patchThread(
		threadId: string,
		update: (row: Readonly<AgentThreadEntity>) => AgentThreadRowPatch | null | undefined,
		ctx: OperationContext,
	): Promise<AgentThreadEntity | null> {
		return await this.runInTransaction(ctx, async (manager) => {
			const row = await manager.findOne(AgentThreadEntity, {
				where: { id: threadId },
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			if (!row) return null;

			const patch = update(row);
			if (!patch) return row;

			if (patch.title !== undefined) row.title = patch.title;
			if (patch.metadata !== undefined) row.metadata = patch.metadata;
			return await manager.save(AgentThreadEntity, row);
		});
	}
}
