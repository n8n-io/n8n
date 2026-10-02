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
	 * Takes the record of the version for a run that starts now, unless another
	 * run holds it: a `running` record claimed after `staleBefore`. Returns whether
	 * the claim succeeded. Each statement is atomic on its own, so two mains that
	 * claim at the same time cannot both win.
	 */
	async tryClaim(
		targetVersion: BreakingChangeVersion,
		ruleSetFingerprint: string,
		startedAt: Date,
		staleBefore: Date,
		ctx: OperationContext,
	): Promise<boolean> {
		const manager = this.managerFor(ctx);
		const claim = { status: 'running' as const, startedAt, ruleSetFingerprint };

		// An existing record that is not running, or whose run is abandoned, can be taken over.
		// `EntityManager.update` reads an array as a list of ids, so the OR goes through the builder.
		const updated = await manager
			.createQueryBuilder()
			.update(MigrationFindingSync)
			.set(claim)
			.where([
				{ targetVersion, status: Not('running') },
				{ targetVersion, status: 'running', startedAt: LessThan(staleBefore) },
			])
			.execute();
		if ((updated.affected ?? 0) > 0) return true;

		// No record yet, or another run holds it. Only the first inserter of a new record wins.
		const inserted = await manager
			.createQueryBuilder()
			.insert()
			.into(MigrationFindingSync)
			.values({ targetVersion, syncedAt: null, ...claim })
			.orIgnore()
			.execute();
		return inserted.identifiers.length > 0;
	}

	/** Records that the run finished with every batch written. */
	async markComplete(
		targetVersion: BreakingChangeVersion,
		syncedAt: Date,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).update(
			MigrationFindingSync,
			{ targetVersion },
			{ status: 'complete', syncedAt },
		);
	}

	/** Records that the run stopped early, so the version reads as stale. Keeps the last complete time. */
	async markFailed(targetVersion: BreakingChangeVersion, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).update(
			MigrationFindingSync,
			{ targetVersion },
			{ status: 'failed' },
		);
	}
}
