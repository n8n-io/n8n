import { Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import {
	WorkflowReviewRequest,
	type WorkflowReviewRequestDecision,
	type WorkflowReviewRequestState,
} from '../entities/workflow-review-request.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';

/**
 * Keyset pagination boundary. The caller carries `createdAt`/`id` in the cursor
 * itself so pagination never depends on the anchor row still existing.
 */
export type InboxCursor = {
	createdAt: Date;
	id: string;
};

export type FindManyForInboxOptions = {
	/** `null` means all projects (no filter); `[]` means no publish-scoped projects. */
	projectIds: string[] | null;
	/** Requesters always see the reviews they created, regardless of project scope. */
	requesterId: string;
	state?: WorkflowReviewRequestState;
	limit: number;
	cursor?: InboxCursor;
};

/**
 * Projection for the workflow-scoped list: the request fields the use case
 * needs plus the version pinned for the workflow the query was scoped to.
 */
export type WorkflowReviewRequestForWorkflowRow = Pick<
	WorkflowReviewRequest,
	'id' | 'state' | 'decision' | 'updatedById' | 'createdAt' | 'updatedAt'
> & {
	workflowVersionId: string | null;
};

export type CountByStateForInboxOptions = {
	/** `null` means all projects (no filter); `[]` means no publish-scoped projects. */
	projectIds: string[] | null;
	/** Requesters always see the reviews they created, regardless of project scope. */
	requesterId: string;
};

export type InboxStateCounts = {
	open: number;
	closed: number;
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

	/**
	 * Persists an already-loaded request. Deliberately `save` and not `update`, so the
	 * entity's `@BeforeUpdate` hook bumps `updatedAt`.
	 */
	async saveRequest(
		request: WorkflowReviewRequest,
		ctx: OperationContext,
	): Promise<WorkflowReviewRequest> {
		return await this.managerFor(ctx).save(WorkflowReviewRequest, request);
	}

	/**
	 * Closes every open request left with no linked workflow, returning the ids closed.
	 *
	 * A workflow hard delete cascades the link rows away, so an open request that has
	 * lost its last one covers nothing and can never be acted on again. `create` writes
	 * the request and its link row in one transaction, so a request is only ever visible
	 * without links once the workflow behind it is gone — the two steps here cannot see
	 * a half-written create and so need no lock.
	 */
	async closeOrphanedOpenRequests(ctx: OperationContext): Promise<string[]> {
		const openState: WorkflowReviewRequestState = 'open';
		const closedState: WorkflowReviewRequestState = 'closed';
		const manager = this.managerFor(ctx);

		const orphans = await manager
			.createQueryBuilder(WorkflowReviewRequest, 'review')
			.select('review.id', 'id')
			.where('review.state = :openState', { openState })
			.andWhere((qb) => {
				const linkedWorkflowExists = qb
					.subQuery()
					.select('1')
					.from(WorkflowReviewRequestWorkflow, 'requestWorkflow')
					.where('requestWorkflow.workflowReviewRequestId = review.id')
					.getQuery();
				return `NOT EXISTS ${linkedWorkflowExists}`;
			})
			.getRawMany<{ id: string }>();

		if (orphans.length === 0) return [];

		const ids = orphans.map(({ id }) => id);
		// A system close has no closing user; the decision stays as-is.
		await manager.update(WorkflowReviewRequest, ids, {
			state: closedState,
			closedById: null,
		});

		return ids;
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
			.where('requestWorkflow.workflowId = :workflowId', { workflowId })
			.orderBy('request.createdAt', 'DESC')
			// Ids are random, so this only breaks ties deterministically: callers ask
			// for the newest review to decide the publish gate, and that answer must
			// not flip between requests when two reviews share a timestamp.
			.addOrderBy('request.id', 'DESC');

		if (options.state) {
			qb.andWhere('request.state = :state', { state: options.state });
		}
		if (options.skip !== undefined) {
			qb.skip(options.skip);
		}
		if (options.take !== undefined) {
			qb.take(options.take);
		}

		const [{ entities, raw }, count] = await Promise.all([
			qb.getRawAndEntities<{ request_id: string; pinnedWorkflowVersionId: string | null }>(),
			qb.getCount(),
		]);

		// Raw rows are 1:1 with entities — the (requestId, workflowId) pair is unique —
		// but key by id instead of index to stay independent of entity deduplication.
		const versionIdByRequestId = new Map(
			raw.map((row) => [row.request_id, row.pinnedWorkflowVersionId ?? null]),
		);
		const requests = entities.map((entity) => ({
			id: entity.id,
			state: entity.state,
			decision: entity.decision,
			updatedById: entity.updatedById,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			workflowVersionId: versionIdByRequestId.get(entity.id) ?? null,
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

	/**
	 * All open requests linked to any of the given workflows, each with the
	 * subset of those workflows it is linked to — so a lifecycle cleanup can
	 * close a request once while still knowing which workflows were affected.
	 */
	async findOpenRequestsForWorkflows(
		workflowIds: string[],
		ctx: OperationContext,
	): Promise<Array<{ request: WorkflowReviewRequest; workflowIds: string[] }>> {
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
			.where('requestWorkflow.workflowId IN (:...workflowIds)', { workflowIds })
			.andWhere('request.state = :state', { state })
			.getRawAndEntities<{ request_id: string; linkedWorkflowId: string }>();

		// Raw rows are per (request, workflow) pair; entities are deduplicated.
		const workflowIdsByRequestId = new Map<string, string[]>();
		for (const row of raw) {
			const linked = workflowIdsByRequestId.get(row.request_id) ?? [];
			linked.push(row.linkedWorkflowId);
			workflowIdsByRequestId.set(row.request_id, linked);
		}

		return entities.map((request) => ({
			request,
			workflowIds: workflowIdsByRequestId.get(request.id) ?? [],
		}));
	}

	async findManyForInbox(options: FindManyForInboxOptions): Promise<WorkflowReviewRequest[]> {
		const { projectIds, requesterId, state, limit, cursor } = options;

		const queryBuilder = this.createQueryBuilder('review')
			.orderBy('review.createdAt', 'DESC')
			.addOrderBy('review.id', 'ASC');

		this.applyInboxVisibility(queryBuilder, projectIds, requesterId);

		if (state !== undefined) {
			queryBuilder.andWhere('review.state = :state', { state });
		}

		if (cursor) {
			queryBuilder.andWhere(
				'(review.createdAt < :createdAt OR (review.createdAt = :createdAt AND review.id > :id))',
				{ createdAt: cursor.createdAt, id: cursor.id },
			);
		}

		queryBuilder.take(limit);

		return await queryBuilder.getMany();
	}

	async countByStateForInbox(options: CountByStateForInboxOptions): Promise<InboxStateCounts> {
		const { projectIds, requesterId } = options;

		const queryBuilder = this.createQueryBuilder('review')
			.select('review.state', 'state')
			.addSelect('COUNT(*)', 'count')
			.groupBy('review.state');

		this.applyInboxVisibility(queryBuilder, projectIds, requesterId);

		const rows = await queryBuilder.getRawMany<{
			state: WorkflowReviewRequestState;
			count: string | number;
		}>();

		return {
			open: Number(rows.find((row) => row.state === 'open')?.count ?? 0),
			closed: Number(rows.find((row) => row.state === 'closed')?.count ?? 0),
		};
	}

	/**
	 * Inbox visibility: a review is visible if the caller is its requester OR it
	 * belongs to a project the caller can publish to. `projectIds === null`
	 * means global scope (no filter). An empty `projectIds` still matches the
	 * caller's own requests.
	 */
	private applyInboxVisibility(
		queryBuilder: SelectQueryBuilder<WorkflowReviewRequest>,
		projectIds: string[] | null,
		requesterId: string,
	): void {
		if (projectIds === null) {
			return;
		}

		if (projectIds.length === 0) {
			queryBuilder.andWhere('review.createdById = :requesterId', { requesterId });
			return;
		}

		queryBuilder.andWhere(
			'(review.projectId IN (:...projectIds) OR review.createdById = :requesterId)',
			{ projectIds, requesterId },
		);
	}
}
