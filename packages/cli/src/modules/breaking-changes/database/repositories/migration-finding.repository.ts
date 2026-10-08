import {
	migrationFindingTriageStatusSchema,
	type BreakingChangeVersion,
	type MigrationFindingStatus,
	type MigrationFindingTriageStatus,
} from '@n8n/api-types';
import {
	BaseRepository,
	chunkIds,
	type OperationContext,
	TransactionRunner,
	type WorkflowEntity,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, Not, type EntityManager } from '@n8n/typeorm';

import { MigrationFinding, type MigrationFindingId } from '../entities/migration-finding.entity';

/** A finding the scan detected. New findings always start as `open`. */
export type NewMigrationFinding = Pick<MigrationFinding, 'targetVersion' | 'ruleId' | 'workflowId'>;

/** A finding in a status a user can set, with the workflow columns the report shows. */
export type TriageableMigrationFinding = Pick<MigrationFinding, 'id' | 'ruleId' | 'workflowId'> & {
	status: MigrationFindingTriageStatus;
	workflow: Pick<WorkflowEntity, 'id' | 'name' | 'activeVersionId' | 'updatedAt'>;
};

const TRIAGE_STATUSES = migrationFindingTriageStatusSchema.options;

function hasTriageStatus(
	finding: MigrationFinding,
): finding is MigrationFinding & { status: MigrationFindingTriageStatus } {
	return migrationFindingTriageStatusSchema.safeParse(finding.status).success;
}

export interface OpenFindingCount {
	ruleId: string;
	count: number;
}

/** The id lists to query one by one. No filter means one unfiltered query; an empty filter, none. */
function chunksOrAll(workflowIds: string[] | undefined): Array<string[] | undefined> {
	return workflowIds === undefined ? [undefined] : chunkIds(workflowIds);
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

	/**
	 * Number of open findings per rule for the version. Rules without open findings
	 * are absent. `workflowIds` limits the count to those workflows; `undefined` counts all.
	 */
	async countOpenByRule(
		targetVersion: BreakingChangeVersion,
		workflowIds: string[] | undefined,
		ctx: OperationContext,
	): Promise<OpenFindingCount[]> {
		const countByRule = new Map<string, number>();
		for (const chunk of chunksOrAll(workflowIds)) {
			const query = this.managerFor(ctx)
				.createQueryBuilder(MigrationFinding, 'finding')
				.select('finding.ruleId', 'ruleId')
				.addSelect('COUNT(finding.id)', 'count')
				.where('finding.targetVersion = :targetVersion', { targetVersion })
				.andWhere('finding.status = :status', { status: 'open' })
				.groupBy('finding.ruleId');
			if (chunk) query.andWhere('finding.workflowId IN (:...workflowIds)', { workflowIds: chunk });
			const rows = await query.getRawMany<{ ruleId: string; count: number | string }>();

			// Postgres returns COUNT as a bigint string, SQLite as a number.
			for (const row of rows) {
				countByRule.set(row.ruleId, (countByRule.get(row.ruleId) ?? 0) + Number(row.count));
			}
		}
		return [...countByRule].map(([ruleId, count]) => ({ ruleId, count }));
	}

	/**
	 * Number of distinct workflows with at least one open finding for the version.
	 * `workflowIds` limits the count to those workflows; `undefined` counts all.
	 */
	async countDistinctOpenWorkflows(
		targetVersion: BreakingChangeVersion,
		workflowIds: string[] | undefined,
		ctx: OperationContext,
	): Promise<number> {
		let total = 0;
		for (const chunk of chunksOrAll(workflowIds)) {
			const query = this.managerFor(ctx)
				.createQueryBuilder(MigrationFinding, 'finding')
				.select('COUNT(DISTINCT finding.workflowId)', 'count')
				.where('finding.targetVersion = :targetVersion', { targetVersion })
				.andWhere('finding.status = :status', { status: 'open' });
			if (chunk) query.andWhere('finding.workflowId IN (:...workflowIds)', { workflowIds: chunk });
			const row = await query.getRawOne<{ count: number | string }>();

			// Postgres returns COUNT as a bigint string, SQLite as a number.
			// Chunks hold distinct ids, so their counts add up.
			total += Number(row?.count ?? 0);
		}
		return total;
	}

	/**
	 * Rules with at least one won't fix finding for the version. `workflowIds`
	 * limits the search to those workflows; `undefined` searches all.
	 */
	async listRuleIdsWithWontFix(
		targetVersion: BreakingChangeVersion,
		workflowIds: string[] | undefined,
		ctx: OperationContext,
	): Promise<string[]> {
		const ruleIds = new Set<string>();
		for (const chunk of chunksOrAll(workflowIds)) {
			const query = this.managerFor(ctx)
				.createQueryBuilder(MigrationFinding, 'finding')
				.select('DISTINCT finding.ruleId', 'ruleId')
				.where('finding.targetVersion = :targetVersion', { targetVersion })
				.andWhere('finding.status = :status', { status: 'wont_fix' });
			if (chunk) query.andWhere('finding.workflowId IN (:...workflowIds)', { workflowIds: chunk });
			const rows = await query.getRawMany<{ ruleId: string }>();
			for (const row of rows) ruleIds.add(row.ruleId);
		}
		return [...ruleIds];
	}

	/**
	 * Findings of one rule for the version in a status a user can set (open and
	 * won't fix), each with its workflow's report columns. `workflowIds` limits
	 * the list to those workflows; `undefined` lists all.
	 */
	async listTriageableForRule(
		targetVersion: BreakingChangeVersion,
		ruleId: string,
		workflowIds: string[] | undefined,
		ctx: OperationContext,
	): Promise<TriageableMigrationFinding[]> {
		const findings: MigrationFinding[] = [];
		for (const chunk of chunksOrAll(workflowIds)) {
			const rows = await this.managerFor(ctx).find(MigrationFinding, {
				select: {
					id: true,
					ruleId: true,
					workflowId: true,
					status: true,
					workflow: { id: true, name: true, activeVersionId: true, updatedAt: true },
				},
				where: {
					targetVersion,
					ruleId,
					status: In(TRIAGE_STATUSES),
					...(chunk ? { workflowId: In(chunk) } : {}),
				},
				relations: { workflow: true },
			});
			findings.push(...rows);
		}
		// The query already filters by status. The guard only narrows the type.
		return findings.sort((a, b) => a.id - b.id).filter(hasTriageStatus);
	}

	/**
	 * Sets the status a user picked on one finding. Returns `false` when the finding
	 * does not exist or is in a status only the scan sets, for example `fixed`.
	 * `statusChangedAt` moves only when the status actually changes.
	 */
	async setTriageStatus(
		targetVersion: BreakingChangeVersion,
		ruleId: string,
		workflowId: string,
		status: MigrationFindingTriageStatus,
		ctx: OperationContext,
	): Promise<boolean> {
		const manager = this.managerFor(ctx);
		const finding = await manager.findOne(MigrationFinding, {
			select: { id: true, status: true },
			where: { targetVersion, ruleId, workflowId, status: In(TRIAGE_STATUSES) },
		});
		if (!finding) return false;
		if (finding.status === status) return true;

		// The update matches only the statuses a user can set, so a sync that marks
		// the finding fixed in the meantime is not overwritten. Then no row changes
		// and the caller gets `false`.
		const result = await manager.update(
			MigrationFinding,
			{ id: finding.id, status: In(TRIAGE_STATUSES) },
			{ status, statusChangedAt: new Date() },
		);
		return (result.affected ?? 0) > 0;
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
