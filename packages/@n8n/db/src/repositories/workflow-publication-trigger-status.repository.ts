import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { WorkflowPublicationTriggerStatus } from '../entities';
import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxStatus,
} from '../entities/workflow-publication-outbox';
import { chunkIds } from '../utils/chunk-ids';

export type TriggerStatusRow = {
	nodeId: string;
	versionId: string;
	status: WorkflowPublicationTriggerStatus['status'];
	triggerKind: WorkflowPublicationTriggerStatus['triggerKind'];
	errorMessage: string | null;
};

/** A trigger that should be registered in memory on the owning instance. */
export type InMemoryTriggerRef = {
	workflowId: string;
	nodeId: string;
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
	 * Returns every trigger status row that claims an in-memory registration
	 * (`activated`, in-memory) — deliberately including rows of unpublished
	 * workflows: stale rows left by an interrupted unpublish then surface as a
	 * deficit, and reconciliation heals them by re-running the unpublish.
	 * Workflows with an in-flight (pending/in-progress) publication record are
	 * excluded: that publication is about to reconcile them anyway.
	 */
	async findActivatedInMemoryTriggers(): Promise<InMemoryTriggerRef[]> {
		return await this.createQueryBuilder('ts')
			.select(['ts.workflowId AS "workflowId"', 'ts.nodeId AS "nodeId"'])
			.where('ts.status = :status', { status: 'activated' })
			.andWhere('ts.triggerKind = :kind', { kind: 'in-memory' })
			.andWhere((qb) => {
				const inFlight = qb
					.subQuery()
					.select('1')
					.from(WorkflowPublicationOutbox, 'outbox')
					.where('outbox.workflowId = ts.workflowId')
					.andWhere('outbox.status IN (:...inFlightStatuses)', {
						inFlightStatuses: [
							WorkflowPublicationOutboxStatus.Pending,
							WorkflowPublicationOutboxStatus.InProgress,
						],
					})
					.getQuery();
				return `NOT EXISTS ${inFlight}`;
			})
			.getRawMany<InMemoryTriggerRef>();
	}

	/**
	 * Aggregate settled trigger counts per workflow for a set of workflows.
	 * Returns a map containing the total and failed trigger counts for each specified workflow.
	 * This lets us determine the overall status for that workflow.  A workflow with no triggers
	 * will not appear in the map.
	 *
	 * @param workflowIds The IDs of the workflows to aggregate trigger counts for.
	 * @returns A map from workflow ID to an object containing the total and failed trigger counts.
	 */
	async getStatusCountsByWorkflowIds(
		workflowIds: string[],
	): Promise<Map<string, { total: number; failed: number }>> {
		const counts = new Map<string, { total: number; failed: number }>();
		// Type-bound so a change to the status union surfaces here instead of
		// silently miscounting inside the raw SQL literal.
		const failedStatus: WorkflowPublicationTriggerStatus['status'] = 'failed';

		// Break workflowIds into chunks to avoid exceeding driver bind-parameter limits.
		for (const chunk of chunkIds(workflowIds)) {
			const rows = await this.createQueryBuilder('t')
				.select('t.workflowId', 'workflowId')
				.addSelect('COUNT(*)', 'total')
				.addSelect('SUM(CASE WHEN t.status = :failedStatus THEN 1 ELSE 0 END)', 'failed')
				.setParameter('failedStatus', failedStatus)
				.where('t.workflowId IN (:...workflowIds)', { workflowIds: chunk })
				.groupBy('t.workflowId')
				.getRawMany<{ workflowId: string; total: string | number; failed: string | number }>();

			for (const row of rows) {
				// Raw aggregates come back as strings on some drivers; normalise to number.
				counts.set(row.workflowId, { total: Number(row.total), failed: Number(row.failed) });
			}
		}
		return counts;
	}
}
