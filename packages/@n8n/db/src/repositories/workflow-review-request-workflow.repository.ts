import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';

@Service()
export class WorkflowReviewRequestWorkflowRepository extends Repository<WorkflowReviewRequestWorkflow> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequestWorkflow, dataSource.manager);
	}

	async createWorkflowRow(
		input: {
			id?: string;
			workflowReviewRequestId: string;
			workflowId: string;
			workflowVersionId?: string | null;
		},
		trx?: EntityManager,
	): Promise<WorkflowReviewRequestWorkflow> {
		const manager = trx ?? this.manager;
		const entity = this.create({
			id: input.id,
			workflowReviewRequestId: input.workflowReviewRequestId,
			workflowId: input.workflowId,
			workflowVersionId: input.workflowVersionId ?? null,
		});

		return await manager.save(WorkflowReviewRequestWorkflow, entity);
	}

	async findByRequestId(requestId: string): Promise<WorkflowReviewRequestWorkflow[]> {
		return await this.find({
			where: { workflowReviewRequestId: requestId },
			order: { id: 'ASC' },
		});
	}

	/** One workflow per review for now; multi-workflow "primary" selection can wait. */
	async findWorkflowNamesByRequestIds(requestIds: string[]): Promise<Map<string, string>> {
		if (requestIds.length === 0) {
			return new Map();
		}

		// Join via entity so DB_TABLE_PREFIX is applied (postgres ITs).
		const rows = await this.createQueryBuilder('wrw')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = wrw.workflowId')
			.select('wrw.workflowReviewRequestId', 'requestId')
			.addSelect('workflow.name', 'workflowName')
			.where('wrw.workflowReviewRequestId IN (:...requestIds)', { requestIds })
			.getRawMany<{ requestId: string; workflowName: string }>();

		return new Map(rows.map((row) => [row.requestId, row.workflowName]));
	}
}
