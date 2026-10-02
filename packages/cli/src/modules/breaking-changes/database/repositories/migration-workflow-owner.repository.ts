import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { MigrationWorkflowOwner } from '../entities/migration-workflow-owner.entity';

/** The owner the heuristic proposes for one workflow. */
export interface OwnerSuggestion {
	workflowId: string;
	userId: string;
}

@Service()
export class MigrationWorkflowOwnerRepository extends BaseRepository<MigrationWorkflowOwner> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(MigrationWorkflowOwner, dataSource.manager, transactionRunner);
	}

	async findByWorkflowIds(
		workflowIds: string[],
		ctx: OperationContext,
	): Promise<MigrationWorkflowOwner[]> {
		if (workflowIds.length === 0) return [];
		return await this.managerFor(ctx).find(MigrationWorkflowOwner, {
			where: { workflowId: In(workflowIds) },
		});
	}

	/**
	 * Writes the heuristic's suggestions for a batch of workflows. A workflow in
	 * `workflowIds` without a suggestion loses any earlier suggestion. A workflow a
	 * person assigned keeps its owner: an assignment is never overwritten here.
	 */
	async replaceSuggestions(
		workflowIds: string[],
		suggestions: OwnerSuggestion[],
		ctx: OperationContext,
	): Promise<void> {
		if (workflowIds.length === 0) return;
		const manager = this.managerFor(ctx);

		// Earlier suggestions for the batch go first, so each workflow ends with at most
		// one row. The insert then ignores every workflow that still has a row, which is
		// exactly the assigned ones.
		await manager.delete(MigrationWorkflowOwner, {
			workflowId: In(workflowIds),
			source: 'suggested',
		});

		const batch = new Set(workflowIds);
		const rows = suggestions
			.filter((suggestion) => batch.has(suggestion.workflowId))
			.map((suggestion) => ({ ...suggestion, source: 'suggested' as const, assignedById: null }));
		if (rows.length === 0) return;

		await manager
			.createQueryBuilder()
			.insert()
			.into(MigrationWorkflowOwner)
			.values(rows)
			.orIgnore()
			.execute();
	}
}
