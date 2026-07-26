import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiThreadGrant } from '../entities/instance-ai-thread-grant.entity';

@Service()
export class InstanceAiThreadGrantRepository extends Repository<InstanceAiThreadGrant> {
	constructor(dataSource: DataSource) {
		super(InstanceAiThreadGrant, dataSource.manager);
	}

	/**
	 * Persist an "always allow" grant. Idempotent across mains via the composite
	 * PK — a concurrent duplicate is ignored rather than erroring.
	 */
	async grant(threadId: string, userId: string, grantKey: string): Promise<void> {
		await this.createQueryBuilder()
			.insert()
			.values({ threadId, userId, grantKey })
			.orIgnore()
			.execute();
	}

	/** The grant keys this user holds in this thread. */
	async findKeys(threadId: string, userId: string): Promise<Set<string>> {
		const rows = await this.find({
			where: { threadId, userId },
			select: ['grantKey'],
		});
		return new Set(rows.map((row) => row.grantKey));
	}
}
