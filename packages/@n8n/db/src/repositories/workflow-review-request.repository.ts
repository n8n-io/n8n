import type { WorkflowReviewClosedReason } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { WorkflowSharingRole } from '@n8n/permissions';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { SharedWorkflow } from '../entities/shared-workflow';
import { WorkflowEntity } from '../entities/workflow-entity';
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
 * Splits the visible reviews into the two groups a caller can ask for:
 * `waiting` = assigned reviewer, or not an author; `authored` = an author who is
 * not assigned to review it. Being a reviewer wins, so a review sits where the
 * caller's pending action is. Only narrows what visibility already allowed.
 *
 * Authorship alone decides the split. The requester always has an author row, so
 * neither group needs the nullable `createdById`.
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
			 * Projects the caller reads workflows through: their personal project,
			 * where directly shared workflows land, plus team projects granting
			 * `workflow:read`. `null` means every project — listing them all would
			 * bind one parameter per project on every inbox query.
			 */
			readableProjectIds: string[] | null;
			/** Workflow sharing roles that grant `workflow:read`. */
			readableWorkflowRoles: string[];
	  };

export type FindManyForInboxOptions = {
	visibility: InboxVisibility;
	state?: WorkflowReviewRequestState;
	/** Omitted means no category filter. */
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

/** An open request the reconciliation sweep closed, and what made its workflow unreviewable. */
export type ClosedUnreviewableRequest = {
	id: string;
	reason: WorkflowReviewClosedReason;
};

/** One row per (open request, linked workflow); a request with no link left yields one empty row. */
type OpenRequestWorkflowRow = {
	requestId: string;
	requestProjectId: string;
	linkedWorkflowId: string | null;
	/** Raw, so the driver's own boolean: `1` on sqlite and mysql, `true` on postgres. */
	isArchived: boolean | number | null;
	owningProjectId: string | null;
};

/** Most to least definitive: one workflow can be several of these at once. */
const CLOSE_REASON_PRECEDENCE: WorkflowReviewClosedReason[] = [
	'workflow-deleted',
	'workflow-archived',
	'workflow-moved',
];

function closeReasonFor(row: OpenRequestWorkflowRow): WorkflowReviewClosedReason | null {
	// Nothing behind the link: either the request has no link row left, or it points at a
	// workflow that is gone. Both mean the delete cascade got there first.
	if (row.linkedWorkflowId === null) return 'workflow-deleted';

	if (row.isArchived) return 'workflow-archived';

	// A workflow with no owning project at all is a broken row, not a move — leave it alone.
	if (row.owningProjectId !== null && row.owningProjectId !== row.requestProjectId) {
		return 'workflow-moved';
	}

	return null;
}

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
	 * Closes every open request whose workflow can no longer be reviewed — deleted, archived, or
	 * moved out of the request's project — reporting each id with the reason that closed it.
	 *
	 * Matches on the workflow's current state rather than on the mutation that changed it, so it
	 * catches what the per-mutation hooks cannot: reviews a delete cascade unlinked before a hook
	 * could find them by workflow id, mutations that skip the hooks entirely, and hooks whose
	 * close rolled back after their mutation had already committed.
	 *
	 * Keys off the ids selected rather than off the state, so the caller must hold the
	 * review-request lock.
	 */
	async closeUnreviewableOpenRequests(ctx: OperationContext): Promise<ClosedUnreviewableRequest[]> {
		const openState: WorkflowReviewRequestState = 'open';
		const closedState: WorkflowReviewRequestState = 'closed';
		const ownerRole: WorkflowSharingRole = 'workflow:owner';
		const manager = this.managerFor(ctx);

		const rows = await manager
			.createQueryBuilder(WorkflowReviewRequest, 'review')
			.select('review.id', 'requestId')
			.addSelect('review.projectId', 'requestProjectId')
			.addSelect('workflow.id', 'linkedWorkflowId')
			.addSelect('workflow.isArchived', 'isArchived')
			.addSelect('shared.projectId', 'owningProjectId')
			// Left joins throughout: a request with no link, or a link with no workflow, is
			// precisely the orphan case, and dropping those rows would hide it.
			.leftJoin(WorkflowReviewRequestWorkflow, 'link', 'link.workflowReviewRequestId = review.id')
			.leftJoin(WorkflowEntity, 'workflow', 'workflow.id = link.workflowId')
			.leftJoin(
				SharedWorkflow,
				'shared',
				'shared.workflowId = link.workflowId AND shared.role = :ownerRole',
				{ ownerRole },
			)
			.where('review.state = :openState', { openState })
			.getRawMany<OpenRequestWorkflowRow>();

		const reasonByRequestId = new Map<string, WorkflowReviewClosedReason>();
		for (const row of rows) {
			const reason = closeReasonFor(row);
			if (reason === null) continue;

			// A request linked to several workflows gets one row each, so keep the most
			// definitive reason rather than whichever row the database returned last.
			const current = reasonByRequestId.get(row.requestId);
			if (
				current !== undefined &&
				CLOSE_REASON_PRECEDENCE.indexOf(current) <= CLOSE_REASON_PRECEDENCE.indexOf(reason)
			) {
				continue;
			}
			reasonByRequestId.set(row.requestId, reason);
		}

		if (reasonByRequestId.size === 0) return [];

		// A system close has no closing user; the decision stays as-is.
		await manager.update(WorkflowReviewRequest, [...reasonByRequestId.keys()], {
			state: closedState,
			closedById: null,
		});

		return [...reasonByRequestId].map(([id, reason]) => ({ id, reason }));
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
	 * caller administers its project or takes part in it, and can still read one of
	 * the workflows it covers. Neither means no rows.
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
		// No separate term for the requester: they always have an author row.
		clauses.push(`(EXISTS ${authorExists} OR EXISTS ${reviewerExists})`);

		// This caller reads every workflow, so the check below is always true. Skip it.
		if (readableProjectIds === null) {
			queryBuilder.andWhere(`(${clauses.join(' OR ')})`, parameters);
			return;
		}

		// A caller who can read no workflow sees no reviews, admins included.
		if (readableProjectIds.length === 0 || readableWorkflowRoles.length === 0) {
			queryBuilder.andWhere('1 = 0');
			return;
		}

		parameters.readableProjectIds = readableProjectIds;
		parameters.readableWorkflowRoles = readableWorkflowRoles;

		// Check the workflows the caller can read now, not the review's stored project,
		// which goes stale. Same rule as the detail gate, so a listed row always opens.
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
	 * `EXISTS`-ready subquery: the caller can read one of the workflows the `review`
	 * row covers, looked up through current `shared_workflow` rows.
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
	 * Narrows the visible rows to one category — see {@link InboxCategoryFilter}.
	 * The two predicates are opposites, so every review lands in exactly one.
	 * Always `andWhere`: {@link applyInboxVisibility} runs first.
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
