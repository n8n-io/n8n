import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { UsageEntity } from '../entities';

@Service()
export class UsageRepository extends Repository<UsageEntity> {
	constructor(dataSource: DataSource) {
		super(UsageEntity, dataSource.manager);
	}

	// return all usage records for a user
	async findByUserId(userId: string) {
		return await this.find({
			where: {
				userId,
			},
		});
	}

	// find usage records by workflowId
	async findByWorkflowId(workflowId: string) {
		return await this.find({
			where: {
				workflowId,
			},
		});
	}

	/**
	 * Adds a usage record for the given workflow/user/date.
	 * If one already exists, it atomically increments the counters.
	 */
	async addTransactionRecord(usage: UsageEntity): Promise<void> {
		await this.manager.transaction(async (tm: EntityManager) => {
			// Normalize executionDate to 'YYYY-MM-DD'
			const dateStr =
				usage.executionDate instanceof Date
					? usage.executionDate.toISOString().slice(0, 10)
					: usage.executionDate;

			// Get the actual table name (with prefix) from the metadata
			const tableName = tm.getRepository(UsageEntity).metadata.tableName;

			// Perform an INSERT ... ON CONFLICT DO UPDATE that *adds* the new values
			await tm
				.createQueryBuilder()
				.insert()
				.into(UsageEntity)
				.values({
					workflowId: usage.workflowId,
					userId: usage.userId,
					executionDate: dateStr,
					tokensConsumed: usage.tokensConsumed,
					costIncurred: usage.costIncurred,
				})
				.onConflict(
					`("workflowId","userId","executionDate") DO UPDATE
			SET
				"tokensConsumed" = "${tableName}"."tokensConsumed" + excluded."tokensConsumed",
				"costIncurred"   = "${tableName}"."costIncurred"   + excluded."costIncurred"`,
				)
				.execute();
		});
	}
	// delete usage records by workflowId
	async deleteByWorkflowId(workflowId: string) {
		return await this.delete({
			workflowId,
		});
	}

	// delete usage records by userId
	async deleteByUserId(userId: string) {
		return await this.delete({
			userId,
		});
	}

	// delete usage records before a date (not including the date)
	async deleteBeforeDate(beforeDate: Date) {
		return await this.createQueryBuilder()
			.delete()
			.from(UsageEntity)
			.where('executionDate < :beforeDate', { beforeDate })
			.execute();
	}
}
