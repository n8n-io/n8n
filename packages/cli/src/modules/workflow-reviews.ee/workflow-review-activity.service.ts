import type {
	CreateWorkflowReviewCommentDto,
	ListWorkflowReviewActivityQueryDto,
	ListWorkflowReviewActivityResponse,
	WorkflowReviewActivityEntry,
	WorkflowReviewEligibleReviewer,
} from '@n8n/api-types';
import {
	TransactionRunner,
	UserRepository,
	WorkflowReviewActivityCommentRepository,
	WorkflowReviewActivityRepository,
	type User,
	type WorkflowReviewActivity,
	type WorkflowReviewActivityComment,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { WorkflowReviewAccessService } from './workflow-review-access.service';
import { WorkflowReviewEligibilityService } from './workflow-review-eligibility.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toActivityEntry, toEligibleReviewer } from './workflow-review.mapper';

/**
 * The review activity feed and the only entry a client writes to it, a comment.
 * Reading is open to anyone who can read the review; posting needs the same
 * eligibility the detail payload advertises as `viewerCanComment`.
 */
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
	) {}

	async listActivity(
		user: User,
		workflowReviewRequestId: string,
		query: ListWorkflowReviewActivityQueryDto,
	): Promise<ListWorkflowReviewActivityResponse> {
		await this.featureGate.assertAvailable();
		await this.accessService.findReadableRequestOrFail(user, workflowReviewRequestId);

		const { limit } = query;
		// Read the tail newest-first and page backwards; the wire stays ascending.
		const rows = await this.activityRepository.findManyForRequest(
			{
				workflowReviewRequestId,
				limit: limit + 1,
				beforeId: query.cursor ? this.decodeCursor(query.cursor) : undefined,
			},
			{},
		);

		const hasMore = rows.length > limit;
		const page = rows.slice(0, limit);
		// Taken while the page is still descending: its last row is the oldest one.
		const oldestRow = page.at(-1);
		const nextCursor = hasMore && oldestRow ? this.encodeCursor(oldestRow.id) : null;
		page.reverse();

		return { data: await this.hydrate(workflowReviewRequestId, page), nextCursor, hasMore };
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
		const { created, message } = await this.txRunner.run({}, async (ctx) => {
			const created = await this.activityRepository.createActivity(
				{
					workflowReviewRequestId,
					type: 'comment.created',
					data: null,
					createdById: user.id,
				},
				ctx,
			);
			const message = await this.activityCommentRepository.createComment(
				{ activityId: created.id, createdById: user.id, body: dto.body },
				ctx,
			);
			return { created, message };
		});

		// The same mapper the feed uses, so a comment does not change shape on reload.
		return toActivityEntry(created, [message], new Map([[user.id, toEligibleReviewer(user)]]));
	}

	private async hydrate(
		workflowReviewRequestId: string,
		rows: WorkflowReviewActivity[],
	): Promise<WorkflowReviewActivityEntry[]> {
		const messages = await this.activityCommentRepository.findManyByActivityIds(
			{ workflowReviewRequestId, activityIds: rows.map((row) => row.id) },
			{},
		);

		const messagesByActivityId = new Map<number, WorkflowReviewActivityComment[]>();
		for (const message of messages) {
			const thread = messagesByActivityId.get(message.activityId) ?? [];
			thread.push(message);
			messagesByActivityId.set(message.activityId, thread);
		}

		const usersById = await this.hydrateAuthors([
			...rows.map((row) => row.createdById),
			...messages.map((message) => message.createdById),
		]);

		return rows.map((row) =>
			toActivityEntry(row, messagesByActivityId.get(row.id) ?? [], usersById),
		);
	}

	/** Deleted authors simply drop out, and the mapper surfaces them as `null`. */
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
