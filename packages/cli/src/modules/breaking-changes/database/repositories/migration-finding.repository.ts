import type { BreakingChangeVersion, MigrationFindingStatus } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { MigrationFinding } from '../entities/migration-finding.entity';

/** A finding the scan detected. New findings always start as `open`. */
export type NewMigrationFinding = Pick<MigrationFinding, 'targetVersion' | 'ruleId' | 'workflowId'>;

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

	async insertMany(findings: NewMigrationFinding[], ctx: OperationContext): Promise<void> {
		if (findings.length === 0) return;

		const statusChangedAt = new Date();
		await this.managerFor(ctx).insert(
			MigrationFinding,
			findings.map((finding) => ({ ...finding, status: 'open' as const, statusChangedAt })),
		);
	}

	/** Sets the triage status. Pass `note` to replace the note; leave it `undefined` to keep it. */
	async updateStatusForIds(
		ids: number[],
		status: MigrationFindingStatus,
		note: string | undefined,
		ctx: OperationContext,
	): Promise<void> {
		if (ids.length === 0) return;

		await this.managerFor(ctx).update(
			MigrationFinding,
			{ id: In(ids) },
			{ status, statusChangedAt: new Date(), ...(note !== undefined ? { note } : {}) },
		);
	}

	/** Called by the sync when a re-scan no longer detects the finding. */
	async markFixedForIds(ids: number[], ctx: OperationContext): Promise<void> {
		await this.updateStatusForIds(ids, 'fixed', undefined, ctx);
	}
}
