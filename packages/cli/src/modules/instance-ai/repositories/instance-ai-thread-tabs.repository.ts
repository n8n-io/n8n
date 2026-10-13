import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { InstanceAiThreadTabs } from '../entities/instance-ai-thread-tabs.entity';

@Service()
export class InstanceAiThreadTabsRepository extends BaseRepository<InstanceAiThreadTabs> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiThreadTabs, dataSource.manager, transactionRunner);
	}

	/** The stored tabs of this user in this thread, as saved. `null` when none are stored. */
	async findState(threadId: string, userId: string): Promise<unknown> {
		const row = await this.findOne({ where: { threadId, userId }, select: ['state'] });
		return row?.state ?? null;
	}

	/** Replace the stored tabs. The composite PK makes concurrent saves last-write-wins. */
	async saveState(
		threadId: string,
		userId: string,
		state: InstanceAiThreadTabsState,
	): Promise<void> {
		await this.upsert({ threadId, userId, state, updatedAt: new Date() }, ['threadId', 'userId']);
	}

	/**
	 * Read the stored tabs, as saved or `null`, and write the state that `update`
	 * returns. `update` returns `null` to keep the stored tabs as they are.
	 */
	async updateState(
		threadId: string,
		userId: string,
		update: (stored: unknown) => InstanceAiThreadTabsState | null,
	): Promise<void> {
		await this.runInTransaction({}, async (manager) => {
			const repository = manager.getRepository(InstanceAiThreadTabs);
			const row = await repository.findOne({
				where: { threadId, userId },
				select: ['state'],
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			const state = update(row?.state ?? null);
			if (state === null) return;
			await repository.upsert({ threadId, userId, state, updatedAt: new Date() }, [
				'threadId',
				'userId',
			]);
		});
	}
}
