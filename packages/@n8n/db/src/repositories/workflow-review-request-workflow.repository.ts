import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';

/** The review's linked workflow as shown in cross-request lists (inbox). */
export type WorkflowReviewRequestLinkedWorkflow = {
	workflowName: string;
	workflowVersionId: string | null;
};

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

	/** Targets the (requestId, workflowId) pair so another workflow's row can never be re-pinned. */
	async updateWorkflowVersion(
		input: {
			workflowReviewRequestId: string;
			workflowId: string;
			workflowVersionId: string;
		},
		trx?: EntityManager,
	): Promise<void> {
		const manager = trx ?? this.manager;
		await manager.update(
			WorkflowReviewRequestWorkflow,
			{
				workflowReviewRequestId: input.workflowReviewRequestId,
				workflowId: input.workflowId,
			},
			{ workflowVersionId: input.workflowVersionId },
		);
	}

	async findByRequestId(
		requestId: string,
		trx?: EntityManager,
	): Promise<WorkflowReviewRequestWorkflow[]> {
		const manager = trx ?? this.manager;
		return await manager.find(WorkflowReviewRequestWorkflow, {
			where: { workflowReviewRequestId: requestId },
			order: { id: 'ASC' },
		});
	}

	/** One workflow per review for now; multi-workflow "primary" selection can wait. */
	async findLinkedWorkflowsByRequestIds(
		requestIds: string[],
	): Promise<Map<string, WorkflowReviewRequestLinkedWorkflow>> {
		if (requestIds.length === 0) {
			return new Map();
		}

		// Join via entity so DB_TABLE_PREFIX is applied (postgres ITs).
		const rows = await this.createQueryBuilder('wrw')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = wrw.workflowId')
			.select('wrw.workflowReviewRequestId', 'requestId')
			.addSelect('workflow.name', 'workflowName')
			.addSelect('wrw.workflowVersionId', 'workflowVersionId')
			.where('wrw.workflowReviewRequestId IN (:...requestIds)', { requestIds })
			.getRawMany<{
				requestId: string;
				workflowName: string;
				workflowVersionId: string | null;
			}>();

		return new Map(
			rows.map((row) => [
				row.requestId,
				{ workflowName: row.workflowName, workflowVersionId: row.workflowVersionId ?? null },
			]),
		);
	}
}
