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
	 * Returns every trigger that should currently be registered in memory across
	 * all workflows: activated, non-webhook (poll/trigger) triggers. Because the
	 * table is fully replaced on each publish, `activated` rows always reflect the
	 * currently published version, so no version filter is needed. This is the
	 * "should be active in memory" set a reconciler diffs against the in-memory
	 * registry.
	 */
	async findActivatedInMemoryTriggers(): Promise<InMemoryTriggerRef[]> {
		return await this.createQueryBuilder('ts')
			.select(['ts.workflowId AS "workflowId"', 'ts.nodeId AS "nodeId"'])
			.where('ts.status = :status', { status: 'activated' })
			.andWhere('ts.triggerKind != :webhook', { webhook: 'webhook' })
			.getRawMany<InMemoryTriggerRef>();
	}
}
