import type {
	ListWorkflowReviewActivityQueryDto,
	ListWorkflowReviewActivityResponse,
	WorkflowReviewActivityEntry,
	WorkflowReviewEligibleReviewer,
} from '@n8n/api-types';
import {
	UserRepository,
	WorkflowReviewActivityRepository,
	type User,
	type WorkflowReviewActivityFeedEntry,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { WorkflowReviewAccessService } from './workflow-review-access.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toActivityEntry, toEligibleReviewer } from './workflow-review.mapper';

@Service()
export class WorkflowReviewActivityService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly accessService: WorkflowReviewAccessService,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly userRepository: UserRepository,
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

	private async hydrate(
		entries: WorkflowReviewActivityFeedEntry[],
	): Promise<WorkflowReviewActivityEntry[]> {
		const usersById = await this.hydrateAuthors(
			entries.flatMap((entry) => [
				entry.activity.createdById,
				...entry.messages.map((message) => message.createdById),
			]),
		);

		return entries.map((entry) => toActivityEntry(entry.activity, entry.messages, usersById));
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
