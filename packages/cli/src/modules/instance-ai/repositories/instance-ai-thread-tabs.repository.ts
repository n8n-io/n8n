import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiThreadTabs } from '../entities/instance-ai-thread-tabs.entity';

@Service()
export class InstanceAiThreadTabsRepository extends Repository<InstanceAiThreadTabs> {
	constructor(dataSource: DataSource) {
		super(InstanceAiThreadTabs, dataSource.manager);
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
}
