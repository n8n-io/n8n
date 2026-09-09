import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowHistory } from '../entities/workflow-history';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import {
	WorkflowReviewRequest,
	type WorkflowReviewRequestDecision,
	type WorkflowReviewRequestState,
} from '../entities/workflow-review-request.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

export type WorkflowReviewRequestForWorkflowRow = Pick<
	WorkflowReviewRequest,
	| 'id'
	| 'projectId'
	| 'state'
	| 'decision'
	| 'description'
	| 'updatedById'
	| 'createdAt'
	| 'updatedAt'
> & {
	workflowVersionId: string | null;
	workflowVersionName: string | null;
};

@Service()
export class WorkflowReviewRequestRepository extends BaseRepository<WorkflowReviewRequest> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewRequest, dataSource.manager, transactionRunner);
	}

	async createRequest(
		input: {
			id?: string;
			projectId: string;
			state?: WorkflowReviewRequestState;
			decision?: WorkflowReviewRequestDecision;
			title: string;
			description?: string | null;
			createdById: string | null;
			updatedById?: string | null;
		},
		ctx: OperationContext,
	): Promise<WorkflowReviewRequest> {
		const entity = this.create({
			id: input.id,
			projectId: input.projectId,
			state: input.state ?? 'open',
			decision: input.decision ?? 'pending',
			title: input.title,
			description: input.description ?? null,
			createdById: input.createdById,
			updatedById: input.updatedById ?? input.createdById,
			closedById: null,
			approvedAt: null,
		});

		return await this.managerFor(ctx).save(WorkflowReviewRequest, entity);
	}

	/** Uses save so the entity's BeforeUpdate hook updates updatedAt. */
	async saveRequest(
		request: WorkflowReviewRequest,
		ctx: OperationContext,
	): Promise<WorkflowReviewRequest> {
		return await this.managerFor(ctx).save(WorkflowReviewRequest, request);
	}

	/** The caller selects the request IDs and holds the review mutation lock. */
	async closeRequests(requestIds: string[], ctx: OperationContext): Promise<void> {
		if (requestIds.length === 0) return;

		const closedState: WorkflowReviewRequestState = 'closed';
		await this.managerFor(ctx).update(WorkflowReviewRequest, requestIds, {
			state: closedState,
			closedById: null,
			// update() does not run the entity's BeforeUpdate hook.
			updatedAt: new Date(),
		});
	}

	async findById(id: string, ctx: OperationContext): Promise<WorkflowReviewRequest | null> {
		return await this.managerFor(ctx).findOne(WorkflowReviewRequest, { where: { id } });
	}

	async findRequestsForWorkflow(
		workflowId: string,
		options: { state?: WorkflowReviewRequestState; skip?: number; take?: number } = {},
	): Promise<[WorkflowReviewRequestForWorkflowRow[], number]> {
		const qb = this.manager
			.createQueryBuilder(WorkflowReviewRequest, 'request')
			.innerJoin(
				WorkflowReviewRequestWorkflow,
				'requestWorkflow',
				'requestWorkflow.workflowReviewRequestId = request.id',
			)
			.addSelect('requestWorkflow.workflowVersionId', 'pinnedWorkflowVersionId')
			.leftJoin(
				WorkflowHistory,
				'pinnedVersion',
				'pinnedVersion.workflowId = requestWorkflow.workflowId AND pinnedVersion.versionId = requestWorkflow.workflowVersionId',
			)
			.addSelect('pinnedVersion.name', 'pinnedWorkflowVersionName')
			.where('requestWorkflow.workflowId = :workflowId', { workflowId })
			.orderBy('request.createdAt', 'DESC')
			// IDs only break timestamp ties. Stable ordering keeps offset pagination consistent
			// when requests have the same creation time.
			.addOrderBy('request.id', 'DESC');

		if (options.state) {
			qb.andWhere('request.state = :state', { state: options.state });
		}
		if (options.skip !== undefined) qb.skip(options.skip);
		if (options.take !== undefined) qb.take(options.take);

		// These calls share a mutable query builder, so run them in order.
		const { entities, raw } = await qb.getRawAndEntities<{
			request_id: string;
			pinnedWorkflowVersionId: string | null;
			pinnedWorkflowVersionName: string | null;
		}>();
		const count = await qb.getCount();

		const pinnedByRequestId = new Map<
			string,
			{ workflowVersionId: string | null; workflowVersionName: string | null }
		>();
		for (const row of raw) {
			pinnedByRequestId.set(row.request_id, {
				workflowVersionId: row.pinnedWorkflowVersionId ?? null,
				workflowVersionName: row.pinnedWorkflowVersionName ?? null,
			});
		}

		const requests = entities.map((entity) => ({
			id: entity.id,
			projectId: entity.projectId,
			state: entity.state,
			decision: entity.decision,
			description: entity.description,
			updatedById: entity.updatedById,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			...pinnedByRequestId.get(entity.id)!,
		}));

		return [requests, count];
	}

	async findOpenRequestForWorkflow(
		workflowId: string,
		ctx: OperationContext,
	): Promise<WorkflowReviewRequest | null> {
		const state: WorkflowReviewRequestState = 'open';

		return await this.managerFor(ctx)
			.createQueryBuilder(WorkflowReviewRequest, 'request')
			.innerJoin(
				WorkflowReviewRequestWorkflow,
				'requestWorkflow',
				'requestWorkflow.workflowReviewRequestId = request.id',
			)
			.where('requestWorkflow.workflowId = :workflowId', { workflowId })
			.andWhere('request.state = :state', { state })
			.orderBy('request.createdAt', 'DESC')
			.getOne();
	}
}
