import type { BreakingChangeVersion, MigrationFindingStatus } from '@n8n/api-types';
import {
	BaseRepository,
	type OperationContext,
	TransactionRunner,
	type WorkflowEntity,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, Not, type EntityManager } from '@n8n/typeorm';

import { MigrationFinding, type MigrationFindingId } from '../entities/migration-finding.entity';

/** A finding the scan detected. New findings always start as `open`. */
export type NewMigrationFinding = Pick<MigrationFinding, 'targetVersion' | 'ruleId' | 'workflowId'>;

/** An open finding with the workflow columns the report shows. */
export type OpenMigrationFinding = Pick<MigrationFinding, 'id' | 'ruleId' | 'workflowId'> & {
	workflow: Pick<WorkflowEntity, 'id' | 'name' | 'activeVersionId' | 'updatedAt'>;
};

export interface OpenFindingCount {
	ruleId: string;
	count: number;
}

@Service()
export class MigrationFindingRepository extends BaseRepository<MigrationFinding> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(MigrationFinding, dataSource.manager, transactionRunner);
	}

	/**
	 * All findings for the given workflows and target version. The sync loads
	 * workflows in batches, so this takes the batch of ids rather than one id.
	 */
	async listForWorkflows(
		targetVersion: BreakingChangeVersion,
		workflowIds: string[],
		ctx: OperationContext,
	): Promise<MigrationFinding[]> {
		if (workflowIds.length === 0) return [];

		return await this.managerFor(ctx).find(MigrationFinding, {
			where: { targetVersion, workflowId: In(workflowIds) },
			order: { id: 'ASC' },
		});
	}

	/** Number of open findings per rule for the version. Rules without open findings are absent. */
	async countOpenByRule(
		targetVersion: BreakingChangeVersion,
		ctx: OperationContext,
	): Promise<OpenFindingCount[]> {
		const rows = await this.managerFor(ctx)
			.createQueryBuilder(MigrationFinding, 'finding')
			.select('finding.ruleId', 'ruleId')
			.addSelect('COUNT(finding.id)', 'count')
			.where('finding.targetVersion = :targetVersion', { targetVersion })
			.andWhere('finding.status = :status', { status: 'open' })
			.groupBy('finding.ruleId')
			.getRawMany<{ ruleId: string; count: number | string }>();

		// Postgres returns COUNT as a bigint string, SQLite as a number.
		return rows.map((row) => ({ ruleId: row.ruleId, count: Number(row.count) }));
	}

	/** Number of distinct workflows with at least one open finding for the version. */
	async countDistinctOpenWorkflows(
		targetVersion: BreakingChangeVersion,
		ctx: OperationContext,
	): Promise<number> {
		const row = await this.managerFor(ctx)
			.createQueryBuilder(MigrationFinding, 'finding')
			.select('COUNT(DISTINCT finding.workflowId)', 'count')
			.where('finding.targetVersion = :targetVersion', { targetVersion })
			.andWhere('finding.status = :status', { status: 'open' })
			.getRawOne<{ count: number | string }>();

		// Postgres returns COUNT as a bigint string, SQLite as a number.
		return Number(row?.count ?? 0);
	}

	/** Open findings of one rule for the version, each with its workflow's report columns. */
	async listOpenForRule(
		targetVersion: BreakingChangeVersion,
		ruleId: string,
		ctx: OperationContext,
	): Promise<OpenMigrationFinding[]> {
		return await this.managerFor(ctx).find(MigrationFinding, {
			select: {
				id: true,
				ruleId: true,
				workflowId: true,
				workflow: { id: true, name: true, activeVersionId: true, updatedAt: true },
			},
			where: { targetVersion, ruleId, status: 'open' },
			relations: { workflow: true },
			order: { id: 'ASC' },
		});
	}

	/**
	 * Inserts the findings as `open`. A finding that exists for the same workflow,
	 * rule and target version is left as it is, so two syncs that run at the same
	 * time on different mains do not fail each other's batches.
	 */
	async insertMany(findings: NewMigrationFinding[], ctx: OperationContext): Promise<void> {
		if (findings.length === 0) return;

		const statusChangedAt = new Date();
		await this.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(MigrationFinding)
			.values(findings.map((finding) => ({ ...finding, status: 'open' as const, statusChangedAt })))
			.orIgnore()
			.execute();
	}

	/**
	 * Sets the triage status. Pass `note` to replace the note; leave it `undefined` to keep it.
	 * `statusChangedAt` moves only for rows whose status actually changes, so a note edit
	 * or a repeated sync does not falsify it.
	 */
	async updateStatusForIds(
		ids: MigrationFindingId[],
		status: MigrationFindingStatus,
		note: string | undefined,
		ctx: OperationContext,
	): Promise<void> {
		if (ids.length === 0) return;

		const manager = this.managerFor(ctx);
		await this.transitionStatus(manager, ids, status);
		if (note !== undefined) {
			await manager.update(MigrationFinding, { id: In(ids) }, { note });
		}
	}

	/** Updates only the rows not already in `status`, so `statusChangedAt` marks a real transition. */
	private async transitionStatus(
		manager: EntityManager,
		ids: MigrationFindingId[],
		status: MigrationFindingStatus,
	): Promise<void> {
		await manager.update(
			MigrationFinding,
			{ id: In(ids), status: Not(status) },
			{ status, statusChangedAt: new Date() },
		);
	}

	/** Called by the sync when a re-scan no longer detects the finding. */
	async markFixedForIds(ids: MigrationFindingId[], ctx: OperationContext): Promise<void> {
		await this.updateStatusForIds(ids, 'fixed', undefined, ctx);
	}

	/**
	 * Records a notification. `notifiedAt` is bumped for every id, so a reminder
	 * updates it, while `statusChangedAt` moves only on the first transition.
	 */
	async markNotifiedForIds(ids: MigrationFindingId[], ctx: OperationContext): Promise<void> {
		if (ids.length === 0) return;

		const manager = this.managerFor(ctx);
		await this.transitionStatus(manager, ids, 'notified');
		await manager.update(MigrationFinding, { id: In(ids) }, { notifiedAt: new Date() });
	}
}
