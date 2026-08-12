import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { WorkflowPublicationTriggerStatus } from '../entities';
import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxStatus,
} from '../entities/workflow-publication-outbox';

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
}
