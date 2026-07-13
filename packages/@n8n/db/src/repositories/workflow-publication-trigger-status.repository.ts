import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { WorkflowPublicationTriggerStatus } from '../entities';

export type TriggerStatusRow = {
	nodeId: string;
	versionId: string;
	status: WorkflowPublicationTriggerStatus['status'];
	errorMessage: string | null;
};

@Service()
export class WorkflowPublicationTriggerStatusRepository extends Repository<WorkflowPublicationTriggerStatus> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublicationTriggerStatus, dataSource.manager);
	}

	/** Replace all rows for a workflow with `rows`, atomically. Pass `trx` to enroll in an existing transaction. */
	async replaceForWorkflow(
		workflowId: string,
		rows: TriggerStatusRow[],
		trx?: EntityManager,
	): Promise<void> {
		const run = async (em: EntityManager) => {
			await em.delete(WorkflowPublicationTriggerStatus, { workflowId });
			if (rows.length === 0) return;
			await em.insert(
				WorkflowPublicationTriggerStatus,
				rows.map((row) => ({ workflowId, ...row })),
			);
		};
		await (trx ? run(trx) : this.manager.transaction(run));
	}

	async findByWorkflowId(workflowId: string): Promise<WorkflowPublicationTriggerStatus[]> {
		return await this.findBy({ workflowId });
	}

	/**
	 * Aggregate settled trigger counts per workflow for a set of workflows.
	 * Returns an entry only for workflows that have at least one row.
	 */
	async getStatusCountsByWorkflowIds(
		workflowIds: string[],
	): Promise<Map<string, { total: number; failed: number }>> {
		if (workflowIds.length === 0) return new Map();

		const rows = await this.createQueryBuilder('t')
			.select('t.workflowId', 'workflowId')
			.addSelect('COUNT(*)', 'total')
			.addSelect("SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END)", 'failed')
			.where('t.workflowId IN (:...workflowIds)', { workflowIds })
			.groupBy('t.workflowId')
			.getRawMany<{ workflowId: string; total: string | number; failed: string | number }>();

		const counts = new Map<string, { total: number; failed: number }>();
		for (const row of rows) {
			// Raw aggregates come back as strings on some drivers; normalise to number.
			counts.set(row.workflowId, { total: Number(row.total), failed: Number(row.failed) });
		}
		return counts;
	}
}
