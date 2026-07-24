import { Service } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowReviewRequestWorkflow } from '../entities/workflow-review-request-workflow.ee';
import {
	WorkflowReviewRequest,
	type WorkflowReviewRequestDecision,
	type WorkflowReviewRequestState,
} from '../entities/workflow-review-request.ee';

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
export class WorkflowReviewRequestRepository extends Repository<WorkflowReviewRequest> {
	constructor(dataSource: DataSource) {
		super(WorkflowReviewRequest, dataSource.manager);
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
		trx?: EntityManager,
	): Promise<WorkflowReviewRequest> {
		const manager = trx ?? this.manager;
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

		return await manager.save(WorkflowReviewRequest, entity);
	}

	async findById(id: string): Promise<WorkflowReviewRequest | null> {
		return await this.findOne({ where: { id } });
	}

	async findRequestsForWorkflow(
		workflowId: string,
		options: { state?: WorkflowReviewRequestState; skip?: number; take?: number } = {},
	): Promise<[WorkflowReviewRequest[], number]> {
		const qb = this.manager
			.createQueryBuilder(WorkflowReviewRequest, 'request')
			.innerJoin(
				WorkflowReviewRequestWorkflow,
				'requestWorkflow',
				'requestWorkflow.workflowReviewRequestId = request.id',
			)
			.where('requestWorkflow.workflowId = :workflowId', { workflowId })
			.orderBy('request.createdAt', 'DESC');

		if (options.state) {
			qb.andWhere('request.state = :state', { state: options.state });
		}
		if (options.skip !== undefined) {
			qb.skip(options.skip);
		}
		if (options.take !== undefined) {
			qb.take(options.take);
		}

		return await qb.getManyAndCount();
	}

	async findOpenRequestForWorkflow(
		workflowId: string,
		trx?: EntityManager,
	): Promise<WorkflowReviewRequest | null> {
		const manager = trx ?? this.manager;
		const state: WorkflowReviewRequestState = 'open';

		return await manager
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
			queryBuilder.where('review.createdById = :requesterId', { requesterId });
			return;
		}

		queryBuilder.where(
			'(review.projectId IN (:...projectIds) OR review.createdById = :requesterId)',
			{ projectIds, requesterId },
		);
	}
}
