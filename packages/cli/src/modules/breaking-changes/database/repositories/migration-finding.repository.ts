import type { BreakingChangeVersion, MigrationFindingStatus } from '@n8n/api-types';
import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, Not, type EntityManager } from '@n8n/typeorm';

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

	/**
	 * Sets the triage status. Pass `note` to replace the note; leave it `undefined` to keep it.
	 * `statusChangedAt` moves only for rows whose status actually changes, so a note edit
	 * or a repeated sync does not falsify it.
	 */
	async updateStatusForIds(
		ids: number[],
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
		ids: number[],
		status: MigrationFindingStatus,
	): Promise<void> {
		await manager.update(
			MigrationFinding,
			{ id: In(ids), status: Not(status) },
			{ status, statusChangedAt: new Date() },
		);
	}

	/** Called by the sync when a re-scan no longer detects the finding. */
	async markFixedForIds(ids: number[], ctx: OperationContext): Promise<void> {
		await this.updateStatusForIds(ids, 'fixed', undefined, ctx);
	}
}
