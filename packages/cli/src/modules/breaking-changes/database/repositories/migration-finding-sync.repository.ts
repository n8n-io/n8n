import type { BreakingChangeVersion } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, LessThan, Not } from '@n8n/typeorm';

import { MigrationFindingSync } from '../entities/migration-finding-sync.entity';

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
	 * Takes the record of the version for a run that starts at `claimedAt`, unless
	 * another run holds it: a `running` record claimed after `staleBefore`. Returns
	 * whether the claim succeeded. `claimedAt` identifies the run from then on: the
	 * terminal updates below take effect only while the record still carries it.
	 */
	async tryClaim(
		targetVersion: BreakingChangeVersion,
		ruleSetFingerprint: string,
		claimedAt: Date,
		staleBefore: Date,
		ctx: OperationContext,
	): Promise<boolean> {
		const manager = this.managerFor(ctx);

		// Make sure a row exists, so the update below is the single arbiter. The result
		// of an ignored insert is not reliable across drivers, so it is not inspected.
		await manager
			.createQueryBuilder()
			.insert()
			.into(MigrationFindingSync)
			.values({
				targetVersion,
				status: 'failed',
				startedAt: null,
				syncedAt: null,
				ruleSetFingerprint,
			})
			.orIgnore()
			.execute();

		// One UPDATE decides: a record that is not running, or whose run is abandoned,
		// can be taken over. Two mains that race here cannot both affect the row.
		// `EntityManager.update` reads an array as a list of ids, so the OR goes through the builder.
		const updated = await manager
			.createQueryBuilder()
			.update(MigrationFindingSync)
			.set({ status: 'running', startedAt: claimedAt, ruleSetFingerprint })
			.where([
				{ targetVersion, status: Not('running') },
				{ targetVersion, status: 'running', startedAt: LessThan(staleBefore) },
			])
			.execute();
		return (updated.affected ?? 0) > 0;
	}

	/**
	 * Records that the run claimed at `claimedAt` finished with every batch written.
	 * Returns `false` when another run has taken the record over in the meantime.
	 */
	async markComplete(
		targetVersion: BreakingChangeVersion,
		claimedAt: Date,
		syncedAt: Date,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			MigrationFindingSync,
			{ targetVersion, status: 'running', startedAt: claimedAt },
			{ status: 'complete', syncedAt },
		);
		return (result.affected ?? 0) > 0;
	}

	/**
	 * Records that the run claimed at `claimedAt` stopped early, so the version reads
	 * as stale. Keeps the last complete time. Returns `false` when another run has
	 * taken the record over in the meantime.
	 */
	async markFailed(
		targetVersion: BreakingChangeVersion,
		claimedAt: Date,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			MigrationFindingSync,
			{ targetVersion, status: 'running', startedAt: claimedAt },
			{ status: 'failed' },
		);
		return (result.affected ?? 0) > 0;
	}
}
