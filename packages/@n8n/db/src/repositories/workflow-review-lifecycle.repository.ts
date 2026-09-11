import { Service } from '@n8n/di';
import type { WorkflowSharingRole } from '@n8n/permissions';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { SharedWorkflow } from '../entities/shared-workflow';
import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import {
	WorkflowReviewRequest,
	type WorkflowReviewRequestState,
} from '../entities/workflow-review-request.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

type OpenRequestWorkflowRow = {
	requestId: string;
	requestProjectId: string;
	linkedWorkflowId: string | null;
	/** Raw database boolean: `1` on SQLite, `true` on Postgres. */
	isArchived: boolean | number | null;
	owningProjectId: string | null;
};

type OpenRequestAffectedByWorkflows = {
	request: WorkflowReviewRequest;
	links: Array<{ workflowId: string; workflowVersionId: string | null }>;
};

function isReviewable(row: OpenRequestWorkflowRow): boolean {
	if (row.linkedWorkflowId === null) return false;
	if (row.isArchived) return false;

	// A missing owner row is broken data, not evidence that the workflow moved.
	return row.owningProjectId === null || row.owningProjectId === row.requestProjectId;
}

@Service()
export class WorkflowReviewLifecycleRepository extends BaseRepository<WorkflowReviewRequest> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowReviewRequest, dataSource.manager, transactionRunner);
	}

	/**
	 * Finds open requests linked to the workflows and returns only the matching links.
	 * Lifecycle handlers use the links to record one activity for each affected workflow.
	 */
	async findOpenRequestsAffectedByWorkflows(
		workflowIds: string[],
		ctx: OperationContext,
	): Promise<OpenRequestAffectedByWorkflows[]> {
		if (workflowIds.length === 0) return [];

		const state: WorkflowReviewRequestState = 'open';
		const { entities, raw } = await this.managerFor(ctx)
			.createQueryBuilder(WorkflowReviewRequest, 'request')
			.innerJoin(
				WorkflowReviewRequestWorkflow,
				'requestWorkflow',
				'requestWorkflow.workflowReviewRequestId = request.id',
			)
			.addSelect('requestWorkflow.workflowId', 'linkedWorkflowId')
			.addSelect('requestWorkflow.workflowVersionId', 'linkedWorkflowVersionId')
			.where('requestWorkflow.workflowId IN (:...workflowIds)', { workflowIds })
			.andWhere('request.state = :state', { state })
			.getRawAndEntities<{
				request_id: string;
				linkedWorkflowId: string;
				linkedWorkflowVersionId: string | null;
			}>();

		const linksByRequestId = new Map<
			string,
			Array<{ workflowId: string; workflowVersionId: string | null }>
		>();
		for (const row of raw) {
			const links = linksByRequestId.get(row.request_id) ?? [];
			links.push({
				workflowId: row.linkedWorkflowId,
				workflowVersionId: row.linkedWorkflowVersionId ?? null,
			});
			linksByRequestId.set(row.request_id, links);
		}

		return entities.map((request) => ({
			request,
			links: linksByRequestId.get(request.id) ?? [],
		}));
	}

	/**
	 * Finds open requests that have no workflow left to review. A workflow is reviewable when it
	 * exists, is not archived, and still belongs to the request's project.
	 *
	 * This checks current workflow state instead of the mutation that changed it. It catches links
	 * removed by delete cascades, mutations that bypass lifecycle hooks, and close operations that
	 * rolled back after the workflow mutation committed.
	 *
	 * This method only reads. The caller must hold the review mutation lock until it closes the
	 * returned requests with the same transaction context.
	 */
	async findUnreviewableOpenRequestIds(
		ctx: OperationContext,
		candidateRequestIds?: string[],
	): Promise<string[]> {
		if (candidateRequestIds?.length === 0) return [];

		const openState: WorkflowReviewRequestState = 'open';
		const ownerRole: WorkflowSharingRole = 'workflow:owner';
		const qb = this.managerFor(ctx)
			.createQueryBuilder(WorkflowReviewRequest, 'review')
			.select('review.id', 'requestId')
			.addSelect('review.projectId', 'requestProjectId')
			.addSelect('workflow.id', 'linkedWorkflowId')
			.addSelect('workflow.isArchived', 'isArchived')
			.addSelect('shared.projectId', 'owningProjectId')
			// Keep requests whose link or workflow was removed so they can be closed.
			.leftJoin(WorkflowReviewRequestWorkflow, 'link', 'link.workflowReviewRequestId = review.id')
			.leftJoin(WorkflowEntity, 'workflow', 'workflow.id = link.workflowId')
			.leftJoin(
				SharedWorkflow,
				'shared',
				'shared.workflowId = link.workflowId AND shared.role = :ownerRole',
				{ ownerRole },
			)
			.where('review.state = :openState', { openState });

		if (candidateRequestIds !== undefined) {
			qb.andWhere('review.id IN (:...candidateRequestIds)', { candidateRequestIds });
		}

		const rows = await qb.getRawMany<OpenRequestWorkflowRow>();
		const closableRequestIds = new Set<string>();
		const requestIdsWithReviewableWorkflow = new Set<string>();
		for (const row of rows) {
			if (isReviewable(row)) {
				requestIdsWithReviewableWorkflow.add(row.requestId);
			} else {
				closableRequestIds.add(row.requestId);
			}
		}
		for (const requestId of requestIdsWithReviewableWorkflow) {
			closableRequestIds.delete(requestId);
		}

		return [...closableRequestIds];
	}
}
