import {
	promotionRunDetailsSchemas,
	type InboxCounts,
	type InboxPromotionReviewItem,
	type PromotionReviewRemoteError,
	type PromotionReviewState,
} from '@n8n/api-types';
import { LicenseState, isEnvFeatureEnabled } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { singleFlight } from '@n8n/utils/promise/single-flight';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import type { PromotionRun } from './database/entities/promotion-run.entity';
import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
} from './git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest } from './git-hosts/gitlab-merge-request.types';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';

type RemoteView = Readonly<{
	mergeRequest: GitLabMergeRequest | null;
	remoteError: PromotionReviewRemoteError | null;
}>;

/**
 * Promotion Reviews as an Inbox source. The first page of each tab and the counters
 * share one sync of the open reviews with the Git host. A host failure never changes a row.
 */
@Service()
export class PromotionReviewInboxService {
	private readonly syncOnce = singleFlight(async () => await this.syncOpenReviews());

	constructor(
		private readonly licenseState: LicenseState,
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly runRepository: PromotionRunRepository,
		private readonly hostResolver: PromotionReviewHostResolver,
		private readonly mergeRequests: GitLabMergeRequestClient,
	) {}

	isEnabled() {
		return (
			this.licenseState.isLicensed(LICENSE_FEATURES.GIT_CONNECTIONS) &&
			isEnvFeatureEnabled('N8N_ENV_FEAT_PROMOTIONS')
		);
	}

	async listForInbox(user: User, query: InboxSourceQuery): Promise<InboxPromotionReviewItem[]> {
		if (!canRead(user)) return [];
		// A sync during "Load more" could move a review above the cursor, where the user never sees it.
		const synced = query.boundary ? new Map<string, RemoteView>() : await this.syncOnce();
		const reviews = await this.reviewRepository.findForInbox(query);
		const runs = await this.newestRuns(reviews);
		const read = await this.readRemote(
			reviews.filter(({ id }) => !synced.has(id)),
			runs,
		);

		return reviews.map((review) => {
			const { mergeRequest, remoteError } = synced.get(review.id) ??
				read.get(review.id) ?? { mergeRequest: null, remoteError: null };
			const run = runs.get(review.id);
			return {
				type: 'promotion_review',
				id: review.id,
				state: query.state,
				reviewState: review.state,
				title: mergeRequest?.title ?? null,
				webUrl: mergeRequest?.web_url ?? null,
				branchName: branchOf(run),
				environmentName: run?.environment?.name ?? null,
				requester: toReviewUser(review.createdBy),
				approver: toReviewUser(review.approvedBy),
				remoteError,
				createdAt: review.createdAt.toISOString(),
				updatedAt: (review.lastStateChangeAt ?? review.createdAt).toISOString(),
			};
		});
	}

	async countForInbox(user: User): Promise<InboxCounts> {
		if (!canRead(user)) return { open: 0, closed: 0 };
		await this.syncOnce();
		return await this.reviewRepository.countForInbox();
	}

	private async syncOpenReviews(): Promise<Map<string, RemoteView>> {
		const reviews = await this.reviewRepository.findOpenReviews();
		const views = await this.readRemote(reviews, await this.newestRuns(reviews));
		for (const review of reviews) {
			const mergeRequest = views.get(review.id)?.mergeRequest;
			if (mergeRequest) await this.applyHostState(review, mergeRequest);
		}
		return views;
	}

	private async newestRuns(reviews: PromotionReview[]): Promise<Map<string, PromotionRun>> {
		const runs = await this.runRepository.findByReviewIds(reviews.map(({ id }) => id));
		const newest = new Map<string, PromotionRun>();
		for (const run of runs.toSorted(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
		)) {
			if (run.reviewId && !newest.has(run.reviewId)) newest.set(run.reviewId, run);
		}
		return newest;
	}

	private async readRemote(
		reviews: PromotionReview[],
		runs: Map<string, PromotionRun>,
	): Promise<Map<string, RemoteView>> {
		const views = await Promise.all(
			reviews.map(async (review) => await this.readOne(review, runs.get(review.id))),
		);
		return new Map(reviews.map(({ id }, index) => [id, views[index]]));
	}

	private async readOne(
		{ type, environment, remoteReviewId }: PromotionReview,
		run: PromotionRun | undefined,
	): Promise<RemoteView> {
		if (!environment || !remoteReviewId) return failed('no_connection');
		try {
			const access = await this.hostResolver.resolveForEnvironment(environment, type);
			if (!access) return failed('no_connection');
			const mergeRequest = await this.mergeRequests.getMergeRequest(
				access,
				parseGitLabReviewId(remoteReviewId),
			);
			// The stored ids are not unique across hosts. Only the branch n8n pushed proves it is ours.
			if (mergeRequest.source_branch !== branchOf(run)) return failed('not_found');
			return { mergeRequest, remoteError: null };
		} catch (error) {
			return failed(remoteErrorOf(error));
		}
	}

	private async applyHostState(review: PromotionReview, mergeRequest: GitLabMergeRequest) {
		const state = toReviewState(mergeRequest);
		if (review.state === 'merged' || review.state === 'closed' || review.state === state) return;
		const at = new Date();
		if (await this.reviewRepository.recordHostState(review.id, state, at)) {
			review.state = state;
			review.lastStateChangeAt = at;
		}
	}
}

const canRead = (user: User) => hasGlobalScope(user, 'gitConnection:readReviews');

const failed = (remoteError: PromotionReviewRemoteError): RemoteView => ({
	mergeRequest: null,
	remoteError,
});

// The GitLab client throws BadRequestError for token, certificate, and URL problems,
// and ServiceUnavailableError or TooManyRequestsError when GitLab cannot answer.
const remoteErrorOf = (error: unknown): PromotionReviewRemoteError => {
	if (error instanceof NotFoundError) return 'not_found';
	if (error instanceof BadRequestError) return 'auth';
	return 'unreachable';
};

const toReviewState = ({
	state,
	detailed_merge_status,
}: GitLabMergeRequest): PromotionReviewState => {
	if (state === 'merged' || state === 'closed') return state;
	return detailed_merge_status === 'requested_changes' ? 'changes_requested' : 'open';
};

const toReviewUser = (user: User | null) =>
	user
		? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }
		: null;

const branchOf = (run: PromotionRun | undefined) => {
	if (!run) return null;
	const parsed = promotionRunDetailsSchemas[run.type].safeParse(run.details);
	return parsed.success ? parsed.data.branchName : null;
};
