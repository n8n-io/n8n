import type {
	CreateWorkflowReviewCommentDto,
	ListWorkflowReviewActivityQueryDto,
	ListWorkflowReviewActivityResponse,
	WorkflowReviewActivityEntry,
	WorkflowReviewEligibleReviewer,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	TransactionRunner,
	UserRepository,
	WorkflowReviewActivityCommentRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestRepository,
	type User,
	type WorkflowReviewActivityFeedEntry,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';

import { WorkflowReviewAuthorizationService } from './workflow-review-authorization.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toActivityEntry, toEligibleReviewer } from './workflow-review.mapper';

@Service()
export class WorkflowReviewActivityService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly authorizationService: WorkflowReviewAuthorizationService,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly activityCommentRepository: WorkflowReviewActivityCommentRepository,
		private readonly requestRepository: WorkflowReviewRequestRepository,
		private readonly userRepository: UserRepository,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
		private readonly eventService: EventService,
	) {}

	async listActivity(
		user: User,
		workflowReviewRequestId: string,
		query: ListWorkflowReviewActivityQueryDto,
	): Promise<ListWorkflowReviewActivityResponse> {
		await this.featureGate.assertAvailable();
		await this.authorizationService.findReadableRequestOrFail(user, workflowReviewRequestId);

		const { entries, hasMore } = await this.activityRepository.findFeedPage(
			{
				workflowReviewRequestId,
				limit: query.limit,
				beforeId: query.cursor ? this.decodeCursor(query.cursor) : undefined,
			},
			{},
		);

		const oldest = entries.at(0);
		const nextCursor = hasMore && oldest ? this.encodeCursor(oldest.activity.id) : null;

		return { data: await this.hydrate(entries), nextCursor, hasMore };
	}

	async createComment(
		user: User,
		workflowReviewRequestId: string,
		dto: CreateWorkflowReviewCommentDto,
	): Promise<WorkflowReviewActivityEntry> {
		await this.featureGate.assertAvailable();

		const access = await this.authorizationService.findReadableRequestOrFail(
			user,
			workflowReviewRequestId,
		);

		const eligibility = await this.authorizationService.resolveViewerEligibility(user, access);
		if (!eligibility.canComment) {
			throw new ForbiddenError('You are not allowed to comment on this review');
		}

		// Every query inside must go through `ctx`. A stray read here needs a second
		// pooled connection while the transaction holds one — a deadlock on a
		// single-connection pool.
		const { activity, message } = await this.txRunner.run({}, async (ctx) => {
			// Re-read inside the transaction, not from the pre-transaction access lookup, so a
			// close committed in between is seen. A close that commits between this read and
			// the comment commit can still slip one comment in — accepted: closing that window
			// would serialize every comment instance-wide for a benign outcome.
			const request = await this.requestRepository.findById(workflowReviewRequestId, ctx);
			if (!request || request.state === 'closed') {
				throw new ConflictError('The review request is no longer open');
			}

			const activity = await this.activityRepository.createActivity(
				{
					workflowReviewRequestId,
					type: 'comment.created',
					data: null,
					createdById: user.id,
				},
				ctx,
			);
			const message = await this.activityCommentRepository.createComment(
				{ activityId: activity.id, createdById: user.id, body: dto.body },
				ctx,
			);
			return { activity, message };
		});

		this.eventService.emit('workflow-review-comment-created', {
			user,
			workflowReviewRequestId,
		});

		return toActivityEntry(
			activity,
			[message],
			new Map([[user.id, toEligibleReviewer(user)]]),
			this.logger,
		);
	}

	private async hydrate(
		entries: WorkflowReviewActivityFeedEntry[],
	): Promise<WorkflowReviewActivityEntry[]> {
		const usersById = await this.hydrateAuthors(
			entries.flatMap((entry) => [
				entry.activity.createdById,
				...entry.messages.map((message) => message.createdById),
			]),
		);

		return entries.map((entry) =>
			toActivityEntry(entry.activity, entry.messages, usersById, this.logger),
		);
	}

	private async hydrateAuthors(
		createdByIds: Array<string | null>,
	): Promise<Map<string, WorkflowReviewEligibleReviewer>> {
		const userIds = new Set(createdByIds.filter((id) => id !== null));
		if (userIds.size === 0) {
			return new Map();
		}

		const users = await this.userRepository.findManyByIds([...userIds]);
		return new Map(users.map((user) => [user.id, toEligibleReviewer(user)]));
	}

	private encodeCursor(id: number): string {
		return Buffer.from(String(id), 'utf8').toString('base64url');
	}

	/**
	 * Strict on purpose: `Buffer.from(x, 'base64url')` never throws and silently drops
	 * invalid characters, and `parseInt('12abc')` is `12`.
	 */
	private decodeCursor(cursor: string): number {
		const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
		if (!/^\d+$/.test(decoded)) {
			throw new BadRequestError('Invalid pagination cursor');
		}

		const id = Number(decoded);
		if (!Number.isSafeInteger(id) || id <= 0) {
			throw new BadRequestError('Invalid pagination cursor');
		}

		return id;
	}
}
