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
	type User,
	type WorkflowReviewActivityFeedEntry,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { WorkflowReviewAccessService } from './workflow-review-access.service';
import { WorkflowReviewEligibilityService } from './workflow-review-eligibility.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toActivityEntry, toEligibleReviewer } from './workflow-review.mapper';

@Service()
export class WorkflowReviewActivityService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly accessService: WorkflowReviewAccessService,
		private readonly eligibilityService: WorkflowReviewEligibilityService,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly activityCommentRepository: WorkflowReviewActivityCommentRepository,
		private readonly userRepository: UserRepository,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
	) {}

	async listActivity(
		user: User,
		workflowReviewRequestId: string,
		query: ListWorkflowReviewActivityQueryDto,
	): Promise<ListWorkflowReviewActivityResponse> {
		await this.featureGate.assertAvailable();
		await this.accessService.findReadableRequestOrFail(user, workflowReviewRequestId);

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

		const access = await this.accessService.findReadableRequestOrFail(
			user,
			workflowReviewRequestId,
		);

		// No lifecycle guard on purpose: a settled review stays open to discussion.
		const eligibility = await this.eligibilityService.resolveViewerEligibility(user, access);
		if (!eligibility.canComment) {
			throw new ForbiddenError('You are not allowed to comment on this review');
		}

		// Every query inside must go through `ctx`. A stray read here needs a second
		// pooled connection while the transaction holds one — a deadlock on a
		// single-connection pool.
		const { activity, message } = await this.txRunner.run({}, async (ctx) => {
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
