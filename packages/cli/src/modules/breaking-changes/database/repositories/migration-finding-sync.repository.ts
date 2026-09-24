import type { BreakingChangeVersion } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { MigrationFindingSync } from '../entities/migration-finding-sync.entity';

export type MigrationFindingSyncRecord = Pick<
	MigrationFindingSync,
	'targetVersion' | 'syncedAt' | 'ruleSetFingerprint'
>;

@Service()
export class MigrationFindingSyncRepository extends BaseRepository<MigrationFindingSync> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(MigrationFindingSync, dataSource.manager, transactionRunner);
	}

	async getForVersion(
		targetVersion: BreakingChangeVersion,
		ctx: OperationContext,
	): Promise<MigrationFindingSync | null> {
		return await this.managerFor(ctx).findOneBy(MigrationFindingSync, { targetVersion });
	}

	/**
	 * Inserts the record for the version, or overwrites it when one exists.
	 * Not named `upsert`, because that would shadow TypeORM's `Repository.upsert`.
	 */
	async upsertForVersion(record: MigrationFindingSyncRecord, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).upsert(MigrationFindingSync, record, ['targetVersion']);
	}
}
