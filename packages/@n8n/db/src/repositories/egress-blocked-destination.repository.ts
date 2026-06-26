import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { EgressBlockedDestination } from '../entities/egress-blocked-destination';

export interface BlockedDestinationRecord {
	hostname: string;
	resolvedIp: string;
	feature: string;
	decision: 'blocked' | 'would-block';
	count: number;
}

@Service()
export class EgressBlockedDestinationRepository extends Repository<EgressBlockedDestination> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(EgressBlockedDestination, dataSource.manager);
	}

	/**
	 * Record a batch of blocked destinations as a set of upserts: each tuple
	 * `(hostname, resolvedIp, feature, decision)` bumps `count` by the batched
	 * amount and refreshes `lastSeen`. Off the request path; safe to call repeatedly.
	 */
	async recordBlocks(records: BlockedDestinationRecord[]): Promise<void> {
		if (records.length === 0) return;
		const isPostgres = this.globalConfig.database.type === 'postgresdb';
		const tableName = this.getTableName('egress_blocked_destination');

		// Run the batch in one transaction so a mid-batch failure can't leave some
		// counts incremented and others not — the whole flush succeeds or rolls back
		// (and is then re-buffered by the caller for the next attempt).
		await this.manager.transaction(async (txManager) => {
			for (const record of records) {
				if (isPostgres) {
					await txManager.query(
						`INSERT INTO ${tableName} ("hostname", "resolvedIp", "feature", "decision", "count", "lastSeen")
						 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP(3))
						 ON CONFLICT ("hostname", "resolvedIp", "feature", "decision")
						 DO UPDATE SET "count" = ${tableName}."count" + $5, "lastSeen" = CURRENT_TIMESTAMP(3)`,
						[record.hostname, record.resolvedIp, record.feature, record.decision, record.count],
					);
				} else {
					await txManager.query(
						`INSERT INTO ${tableName} ("hostname", "resolvedIp", "feature", "decision", "count", "lastSeen")
						 VALUES (?, ?, ?, ?, ?, STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
						 ON CONFLICT ("hostname", "resolvedIp", "feature", "decision")
						 DO UPDATE SET "count" = "count" + ?, "lastSeen" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')`,
						[
							record.hostname,
							record.resolvedIp,
							record.feature,
							record.decision,
							record.count,
							record.count,
						],
					);
				}
			}
		});
	}

	/** The calibration worklist: distinct blocked destinations, most-recent first. */
	async listDestinations(limit = 500): Promise<EgressBlockedDestination[]> {
		return await this.find({
			order: { lastSeen: 'DESC' },
			take: limit,
		});
	}

	/** Clear all recorded destinations (e.g. when an admin resets calibration). */
	async clearAll(): Promise<void> {
		await this.createQueryBuilder().delete().execute();
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}
}
