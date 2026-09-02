import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import type { OperationContext } from '../services/transaction';

/** The review's linked workflow as shown in cross-request lists (inbox). */
export type WorkflowReviewRequestLinkedWorkflow = {
	workflowName: string;
	workflowVersionId: string | null;
};

export type WorkflowReviewRequestWorkflowDetailRow = {
	workflowId: string;
	workflowName: string;
	workflowVersionId: string | null;
};

@Service()
export class WorkflowReviewRequestWorkflowRepository extends BaseRepository<WorkflowReviewRequestWorkflow> {
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
		ctx: OperationContext,
	): Promise<WorkflowReviewRequestWorkflow> {
		const entity = this.create({
			id: input.id,
			workflowReviewRequestId: input.workflowReviewRequestId,
			workflowId: input.workflowId,
			workflowVersionId: input.workflowVersionId ?? null,
		});

		return await this.managerFor(ctx).save(WorkflowReviewRequestWorkflow, entity);
	}

	/** Targets the (requestId, workflowId) pair so another workflow's row can never be re-pinned. */
	async updateWorkflowVersion(
		input: {
			workflowReviewRequestId: string;
			workflowId: string;
			workflowVersionId: string;
		},
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).update(
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
		ctx: OperationContext,
	): Promise<WorkflowReviewRequestWorkflow[]> {
		return await this.managerFor(ctx).find(WorkflowReviewRequestWorkflow, {
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

	async findLinkedWorkflowDetailsByRequestId(
		requestId: string,
	): Promise<WorkflowReviewRequestWorkflowDetailRow[]> {
		// Join via entity so DB_TABLE_PREFIX is applied (postgres ITs).
		const rows = await this.createQueryBuilder('wrw')
			// The inner join is safe: `workflowId` FKs onto `workflow_entity` with
			// `ON DELETE CASCADE`, so a child row never outlives its workflow.
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = wrw.workflowId')
			.select('wrw.workflowId', 'workflowId')
			.addSelect('workflow.name', 'workflowName')
			.addSelect('wrw.workflowVersionId', 'workflowVersionId')
			.where('wrw.workflowReviewRequestId = :requestId', { requestId })
			.orderBy('wrw.id', 'ASC')
			.getRawMany<{
				workflowId: string;
				workflowName: string;
				workflowVersionId: string | null;
			}>();

		return rows.map((row) => ({
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			workflowVersionId: row.workflowVersionId ?? null,
		}));
	}
}
