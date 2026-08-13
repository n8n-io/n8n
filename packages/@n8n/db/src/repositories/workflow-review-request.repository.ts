import { Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { SharedWorkflow } from '../entities/shared-workflow';
import { WorkflowReviewRequestAuthor } from '../entities/workflow-review-request-author.ee';
import { WorkflowReviewRequestReviewer } from '../entities/workflow-review-request-reviewer.ee';
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

/**
 * Partitions the visible reviews into the inbox sections. Reviewer assignment
 * wins when both roles apply, so a review always sits where the caller's
 * pending action is: `waiting` = assigned reviewer, or not an author at all;
 * `authored` = an author and not assigned to review it. Narrows the visibility
 * predicate, never widens it.
 *
 * Authorship alone decides the split — the requester is always an author, since
 * `create` writes their author row in the same transaction and nothing removes
 * one. That keeps both predicates free of the nullable `createdById`.
 */
export type InboxCategoryFilter = {
	userId: string;
	category: 'waiting' | 'authored';
};

/**
 * Who may see which reviews in the inbox.
 *
 * `all` — every review (global admins/owners). `involved` — reviews in projects the
 * caller administers, plus reviews they participate in (author or assigned
 * reviewer; the requester is always an author) — in both cases only while they can
 * still read one of the workflows the review covers.
 */
export type InboxVisibility =
	| { scope: 'all' }
	| {
			scope: 'involved';
			userId: string;
			/** Projects the caller administers: every review in them is visible. */
			adminProjectIds: string[];
			/**
			 * Projects the caller reads workflows through — their personal project
			 * (directly shared workflows land there) plus team projects granting
			 * `workflow:read`. `null` means unrestricted: a global `workflow:read`
			 * scope reads every project, and enumerating them all would bind one
			 * parameter per project on every inbox query.
			 */
			readableProjectIds: string[] | null;
			/** Workflow sharing roles that grant `workflow:read`. */
			readableWorkflowRoles: string[];
	  };

export type FindManyForInboxOptions = {
	visibility: InboxVisibility;
	state?: WorkflowReviewRequestState;
	/** Omitted means no section partitioning. */
	category?: InboxCategoryFilter;
	limit: number;
	cursor?: InboxCursor;
};

/**
 * Projection for the workflow-scoped list: the request fields the use case
 * needs plus the version pinned for the workflow the query was scoped to.
 */
export type WorkflowReviewRequestForWorkflowRow = Pick<
	WorkflowReviewRequest,
	'id' | 'state' | 'decision' | 'description' | 'updatedById' | 'createdAt' | 'updatedAt'
> & {
	workflowVersionId: string | null;
};

export type CountByStateForInboxOptions = {
	visibility: InboxVisibility;
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
			description: entity.description,
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
		const { visibility, state, category, limit, cursor } = options;

		const queryBuilder = this.createQueryBuilder('review')
			.orderBy('review.createdAt', 'DESC')
			.addOrderBy('review.id', 'ASC');

		this.applyInboxVisibility(queryBuilder, visibility);

		if (category) {
			this.applyCategoryFilter(queryBuilder, category);
		}

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
		const queryBuilder = this.createQueryBuilder('review')
			.select('review.state', 'state')
			.addSelect('COUNT(*)', 'count')
			.groupBy('review.state');

		this.applyInboxVisibility(queryBuilder, options.visibility);

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
	 * Inbox visibility — see {@link InboxVisibility}. A review is visible when the
	 * caller administers its project or participates in it (requester, co-author, or
	 * assigned reviewer), *and* can still read one of the workflows it covers. No
	 * participation and no admin projects means no rows.
	 */
	private applyInboxVisibility(
		queryBuilder: SelectQueryBuilder<WorkflowReviewRequest>,
		visibility: InboxVisibility,
	): void {
		if (visibility.scope === 'all') {
			return;
		}

		const { userId, adminProjectIds, readableProjectIds, readableWorkflowRoles } = visibility;

		const parameters: Record<string, unknown> = { involvedUserId: userId };
		const clauses: string[] = [];

		if (adminProjectIds.length > 0) {
			clauses.push('review.projectId IN (:...adminProjectIds)');
			parameters.adminProjectIds = adminProjectIds;
		}

		const authorExists = this.participantExistsSubquery(
			queryBuilder,
			WorkflowReviewRequestAuthor,
			'visibilityAuthor',
			'involvedUserId',
		);
		const reviewerExists = this.participantExistsSubquery(
			queryBuilder,
			WorkflowReviewRequestReviewer,
			'visibilityReviewer',
			'involvedUserId',
		);
		// The requester needs no separate term: `create` writes their author row in the
		// same transaction as the review, and nothing ever removes one.
		clauses.push(`(EXISTS ${authorExists} OR EXISTS ${reviewerExists})`);

		// An unrestricted caller reads every workflow, so the readability conjunct below
		// would always hold — skip it rather than pay two correlated subqueries per row
		// to compute `true`. Safe because the link table cascades on workflow delete, so
		// a covered workflow always exists and always has an owner `shared_workflow` row.
		if (readableProjectIds === null) {
			queryBuilder.andWhere(`(${clauses.join(' OR ')})`, parameters);
			return;
		}

		// Readability is a conjunct, so a caller who can read nothing sees no reviews —
		// admin projects included.
		if (readableProjectIds.length === 0 || readableWorkflowRoles.length === 0) {
			queryBuilder.andWhere('1 = 0');
			return;
		}

		parameters.readableProjectIds = readableProjectIds;
		parameters.readableWorkflowRoles = readableWorkflowRoles;

		// Gate on the covered workflows the caller can currently read rather than
		// the review's stored project. Mirrors the detail read gate exactly
		const anyLinkExists = this.linkedWorkflowExistsSubquery(queryBuilder, 'visibilityAnyLink');
		const readableLinkExists = this.readableLinkedWorkflowExistsSubquery(queryBuilder);

		queryBuilder.andWhere(
			`(${clauses.join(' OR ')}) AND (NOT EXISTS ${anyLinkExists} OR EXISTS ${readableLinkExists})`,
			parameters,
		);
	}

	/** `EXISTS`-ready subquery: the current `review` row covers at least one workflow. */
	private linkedWorkflowExistsSubquery(
		queryBuilder: SelectQueryBuilder<WorkflowReviewRequest>,
		alias: string,
	): string {
		return queryBuilder
			.subQuery()
			.select('1')
			.from(WorkflowReviewRequestWorkflow, alias)
			.where(`${alias}.workflowReviewRequestId = review.id`)
			.getQuery();
	}

	/**
	 * `EXISTS`-ready subquery: the caller can currently read one of the workflows the
	 * `review` row covers, resolved through live `shared_workflow` rows. Only reached
	 * for a project-restricted caller — an unrestricted one skips readability entirely.
	 */
	private readableLinkedWorkflowExistsSubquery(
		queryBuilder: SelectQueryBuilder<WorkflowReviewRequest>,
	): string {
		return queryBuilder
			.subQuery()
			.select('1')
			.from(SharedWorkflow, 'visibilityShared')
			.innerJoin(
				WorkflowReviewRequestWorkflow,
				'visibilityLink',
				'visibilityLink.workflowId = visibilityShared.workflowId',
			)
			.where('visibilityLink.workflowReviewRequestId = review.id')
			.andWhere('visibilityShared.role IN (:...readableWorkflowRoles)')
			.andWhere('visibilityShared.projectId IN (:...readableProjectIds)')
			.getQuery();
	}

	/**
	 * `EXISTS`-ready subquery probing a participant junction table (authors or
	 * reviewers) for the current `review` row and the user bound to `userParameter`.
	 */
	private participantExistsSubquery(
		queryBuilder: SelectQueryBuilder<WorkflowReviewRequest>,
		junctionEntity: typeof WorkflowReviewRequestAuthor | typeof WorkflowReviewRequestReviewer,
		alias: string,
		userParameter: string,
	): string {
		return queryBuilder
			.subQuery()
			.select('1')
			.from(junctionEntity, alias)
			.where(`${alias}.workflowReviewRequestId = review.id`)
			.andWhere(`${alias}.userId = :${userParameter}`)
			.getQuery();
	}

	/**
	 * Partitions the already-visible rows into the inbox sections — see
	 * {@link InboxCategoryFilter} for the reviewer-wins rule. The two predicates
	 * are exact complements, so every visible review lands in exactly one
	 * section. Always `andWhere` — {@link applyInboxVisibility} runs first.
	 */
	private applyCategoryFilter(
		queryBuilder: SelectQueryBuilder<WorkflowReviewRequest>,
		{ userId, category }: InboxCategoryFilter,
	): void {
		const authorExists = this.participantExistsSubquery(
			queryBuilder,
			WorkflowReviewRequestAuthor,
			'author',
			'categoryUserId',
		);
		const reviewerExists = this.participantExistsSubquery(
			queryBuilder,
			WorkflowReviewRequestReviewer,
			'reviewer',
			'categoryUserId',
		);

		if (category === 'authored') {
			queryBuilder.andWhere(`(EXISTS ${authorExists} AND NOT EXISTS ${reviewerExists})`, {
				categoryUserId: userId,
			});
			return;
		}

		queryBuilder.andWhere(`(EXISTS ${reviewerExists} OR NOT EXISTS ${authorExists})`, {
			categoryUserId: userId,
		});
	}
}
