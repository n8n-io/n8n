import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { WorkflowPublicationTriggerStatus } from '../entities';

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
	 * Returns every trigger that should currently be registered in memory: the
	 * activated, in-memory triggers of active workflows. The join on
	 * `activeVersionId` drops stale rows left by an interrupted unpublish, which
	 * would otherwise read as missing forever.
	 */
	async findActivatedInMemoryTriggers(): Promise<InMemoryTriggerRef[]> {
		return await this.createQueryBuilder('ts')
			.innerJoin('ts.workflow', 'workflow', 'workflow.activeVersionId IS NOT NULL')
			.select(['ts.workflowId AS "workflowId"', 'ts.nodeId AS "nodeId"'])
			.where('ts.status = :status', { status: 'activated' })
			.andWhere('ts.triggerKind = :kind', { kind: 'in-memory' })
			.getRawMany<InMemoryTriggerRef>();
	}
}
