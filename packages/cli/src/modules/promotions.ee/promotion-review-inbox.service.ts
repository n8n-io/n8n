import {
	promotionRunDetailsSchemas,
	type InboxCounts,
	type InboxPromotionReviewItem,
	type PromotionReviewDetail,
	type PromotionReviewRemoteError,
	type PromotionReviewState,
	type PromotionReviewSummary,
} from '@n8n/api-types';
import { LicenseState, isEnvFeatureEnabled } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import type { PromotionRun } from './database/entities/promotion-run.entity';
import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
	type GitLabMergeRequest,
} from './git-hosts/gitlab-merge-request.client';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';

type RemoteView = Readonly<{
	mergeRequest: GitLabMergeRequest | null;
	remoteError: PromotionReviewRemoteError | null;
}>;

/**
 * Promotion Reviews as an Inbox source. Each open list reads the open reviews from
 * the Git host and stores state changes. A host failure never changes a row.
 */
@Service()
export class PromotionReviewInboxService {
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
		const synced =
			query.state === 'open' ? await this.syncOpenReviews() : new Map<string, RemoteView>();
		const reviews = await this.reviewRepository.findForInbox(query);
		// Closed reviews are not synced. Read them for the title only.
		const read = await this.readRemote(reviews.filter(({ id }) => !synced.has(id)));
		const runs = await this.runRepository.findByReviewIds(reviews.map(({ id }) => id));

		return reviews.map((review) => {
			const view = synced.get(review.id) ?? read.get(review.id);
			return {
				type: 'promotion_review',
				id: review.id,
				state: query.state,
				reviewState: review.state,
				title: view?.mergeRequest?.title ?? null,
				branchName:
					gitDetails(newestRun(runs.filter((run) => run.reviewId === review.id)))?.branchName ??
					null,
				remoteError: view?.remoteError ?? null,
				createdAt: review.createdAt.toISOString(),
				updatedAt: (review.lastStateChangeAt ?? review.createdAt).toISOString(),
			};
		});
	}

	async countForInbox(user: User): Promise<InboxCounts> {
		return canRead(user) ? await this.reviewRepository.countForInbox() : { open: 0, closed: 0 };
	}

	async getDetail(id: string): Promise<PromotionReviewDetail> {
		const review = await this.reviewRepository.findByIdWithRelations(id);
		if (!review) throw new NotFoundError('Promotion review not found');

		const view = await this.readOne(review);
		const { mergeRequest } = view;
		if (mergeRequest) await this.applyHostState(review, mergeRequest);
		const run = newestRun(review.runs);

		return {
			...toSummary(review, view),
			config: run?.config ? { id: run.config.id, name: run.config.name } : null,
			branchName: gitDetails(run)?.branchName ?? null,
			headCommitSha: mergeRequest?.diff_refs?.head_sha ?? null,
		};
	}

	private async syncOpenReviews(): Promise<Map<string, RemoteView>> {
		const reviews = await this.reviewRepository.findOpenReviews();
		const views = await this.readRemote(reviews);
		for (const review of reviews) {
			const mergeRequest = views.get(review.id)?.mergeRequest;
			if (mergeRequest) await this.applyHostState(review, mergeRequest);
		}
		return views;
	}

	private async readRemote(reviews: PromotionReview[]): Promise<Map<string, RemoteView>> {
		const views = await Promise.all(reviews.map(async (review) => await this.readOne(review)));
		return new Map(reviews.map(({ id }, index) => [id, views[index]]));
	}

	private async readOne({
		type,
		connection,
		remoteReviewId,
	}: PromotionReview): Promise<RemoteView> {
		if (!connection || !remoteReviewId) return failed('no_connection');
		try {
			const access = await this.hostResolver.resolveForConnection(connection, type);
			if (!access) return failed('no_connection');
			const ref = parseGitLabReviewId(remoteReviewId);
			return {
				mergeRequest: await this.mergeRequests.getMergeRequest(access, ref),
				remoteError: null,
			};
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

/** An allowlist: never return the provider, its config or its credentials. */
const toSummary = (review: PromotionReview, view: RemoteView): PromotionReviewSummary => {
	const { mergeRequest, remoteError } = view;
	return {
		id: review.id,
		state: review.state,
		remoteReviewId: review.remoteReviewId,
		connection: review.connection
			? { id: review.connection.id, name: review.connection.name }
			: null,
		createdBy: toReviewUser(review.createdBy),
		approvedBy: toReviewUser(review.approvedBy),
		createdAt: review.createdAt.toISOString(),
		approvedAt: review.approvedAt?.toISOString() ?? null,
		lastStateChangeAt: review.lastStateChangeAt?.toISOString() ?? null,
		remote: mergeRequest
			? {
					title: mergeRequest.title,
					webUrl: mergeRequest.web_url,
					hasConflicts: mergeRequest.has_conflicts,
				}
			: null,
		remoteError,
	};
};

const toReviewUser = (user: User | null) =>
	user
		? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }
		: null;

const newestRun = (runs: PromotionRun[]): PromotionRun | null =>
	runs.toSorted(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
	)[0] ?? null;

const gitDetails = (run: PromotionRun | null) => {
	if (!run) return null;
	const parsed = promotionRunDetailsSchemas[run.type].safeParse(run.details);
	return parsed.success ? parsed.data : null;
};
