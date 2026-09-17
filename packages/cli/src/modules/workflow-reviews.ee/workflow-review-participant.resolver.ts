import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import {
	UserRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
	type WorkflowReviewRequest,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { toEligibleReviewer } from './workflow-review.mapper';

/** Everyone involved in one review, projected onto the boundary user shape. */
export interface WorkflowReviewParticipants {
	requester: WorkflowReviewEligibleReviewer | null;
	authors: WorkflowReviewEligibleReviewer[];
	reviewers: WorkflowReviewEligibleReviewer[];
}

/** Participants of a resolved batch, looked up by review request id. */
export interface WorkflowReviewParticipantLookup {
	for(requestId: string): WorkflowReviewParticipants;
}

/**
 * Resolves who is involved in a review — requester, authors, requested reviewers —
 * for a batch of requests at once, so the inbox list and the detail view share one
 * set of rules and one set of queries.
 */
@Service()
export class WorkflowReviewParticipantResolver {
	constructor(
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Deleted users simply drop out of the result. The requester stays in `authors`
	 * too — deduplication is the caller's presentation concern, and the canonical
	 * requester is returned separately.
	 */
	async resolve(requests: WorkflowReviewRequest[]): Promise<WorkflowReviewParticipantLookup> {
		const requestIds = requests.map((request) => request.id);
		const [reviewerRows, authorRows] = await Promise.all([
			this.workflowReviewRequestReviewerRepository.findByRequestIds(requestIds),
			this.workflowReviewRequestAuthorRepository.findByRequestIds(requestIds),
		]);

		const reviewerIdsByRequestId = groupUserIdsByRequestId(reviewerRows);
		const authorIdsByRequestId = groupUserIdsByRequestId(authorRows);

		const userIds = new Set([
			...requests.map((request) => request.createdById).filter((id) => id !== null),
			...reviewerRows.map((row) => row.userId),
			...authorRows.map((row) => row.userId),
		]);

		const usersById = new Map<string, WorkflowReviewEligibleReviewer>();
		if (userIds.size > 0) {
			for (const user of await this.userRepository.findManyByIds([...userIds])) {
				usersById.set(user.id, toEligibleReviewer(user));
			}
		}

		const project = (userIdsForRequest: string[]) =>
			userIdsForRequest.map((userId) => usersById.get(userId)).filter((user) => user !== undefined);

		const participantsByRequestId = new Map<string, WorkflowReviewParticipants>(
			requests.map((request) => [
				request.id,
				{
					requester: request.createdById ? (usersById.get(request.createdById) ?? null) : null,
					authors: project(authorIdsByRequestId.get(request.id) ?? []),
					reviewers: project(reviewerIdsByRequestId.get(request.id) ?? []),
				},
			]),
		);

		return {
			for: (requestId) =>
				participantsByRequestId.get(requestId) ?? { requester: null, authors: [], reviewers: [] },
		};
	}
}

/** Junction rows (reviewers, authors) collapsed into user ids per request. */
function groupUserIdsByRequestId(
	rows: Array<{ workflowReviewRequestId: string; userId: string }>,
): Map<string, string[]> {
	const idsByRequestId = new Map<string, string[]>();
	for (const { workflowReviewRequestId, userId } of rows) {
		const ids = idsByRequestId.get(workflowReviewRequestId) ?? [];
		ids.push(userId);
		idsByRequestId.set(workflowReviewRequestId, ids);
	}

	return idsByRequestId;
}
