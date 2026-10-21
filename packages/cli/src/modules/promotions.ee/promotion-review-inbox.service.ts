import {
	promotionRunDetailsSchemas,
	type ApprovePromotionReviewDto,
	type InboxCounts,
	type InboxPromotionReviewItem,
	type PromotionReviewRemoteError,
	type PromotionReviewState,
} from '@n8n/api-types';
import { LicenseState, Logger, isEnvFeatureEnabled } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { singleFlight } from '@n8n/utils/promise/single-flight';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import type { PromotionRun } from './database/entities/promotion-run.entity';
import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import type { GitHostAccess } from './git-hosts/git-host.types';
import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
} from './git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest } from './git-hosts/gitlab-merge-request.types';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';
import { approvalNote } from './promotion-review.utils';

type RemoteView = Readonly<{
	mergeRequest: GitLabMergeRequest | null;
	remoteError: PromotionReviewRemoteError | null;
}>;

/** Host access for each environment and review type, shared by one batch of reads. */
type AccessCache = Map<string, Promise<GitHostAccess | null>>;

/** Longer than the two GitLab writes (15 seconds each), so a live approval keeps its claim. */
const APPROVAL_CLAIM_TTL_MS = 2 * 60_000;

const CHANGED_ON_HOST =
	'The merge request changed on GitLab. Reload the Inbox and review the changes again.';

/**
 * Promotion Reviews as an Inbox source, and their approval. The first page of each tab and
 * the counters share one sync of the open reviews with the Git host. A host failure never
 * changes a row.
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
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

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

		return reviews.map((review) =>
			toItem(
				review,
				runs.get(review.id),
				synced.get(review.id) ?? read.get(review.id) ?? { mergeRequest: null, remoteError: null },
			),
		);
	}

	async countForInbox(user: User): Promise<InboxCounts> {
		if (!canRead(user)) return { open: 0, closed: 0 };
		await this.syncOnce();
		return await this.reviewRepository.countForInbox();
	}

	/**
	 * Approves and merges on the host as the GitLab user of the token, then names the n8n
	 * approver in a note. The stored state can be old, so this reads the host first.
	 */
	async approve(
		user: User,
		reviewId: string,
		{ headCommitSha }: ApprovePromotionReviewDto,
	): Promise<InboxPromotionReviewItem> {
		if (!this.isEnabled()) throw new ForbiddenError('Promotion reviews are not enabled.');
		const review = await this.reviewRepository.findByIdWithRelations(reviewId);
		if (!review) throw new NotFoundError('Promotion review not found.');
		if (review.createdById === user.id) {
			throw new ForbiddenError(
				'You requested this promotion. Another owner or admin must approve it.',
			);
		}
		if (review.state === 'merged' || review.state === 'closed') {
			throw new ConflictError(`This promotion review is already ${review.state}.`);
		}

		const run = (await this.newestRuns([review])).get(review.id);
		const host = await this.readMergeRequest(review, run);
		if (!host) {
			throw new BadRequestError(
				'The environment of this promotion review was deleted, or it no longer uses GitLab.',
			);
		}
		const { access, ref, mergeRequest } = host;
		await this.applyHostState(review, mergeRequest);
		const hostState = toReviewState(mergeRequest);
		if (hostState === 'changes_requested') {
			throw new ConflictError('A reviewer requested changes on GitLab.');
		}
		if (hostState !== 'open') {
			throw new ConflictError(`The merge request is already ${hostState} on GitLab.`);
		}
		if (mergeRequest.has_conflicts) {
			throw new ConflictError('The merge request has conflicts. Resolve them on GitLab.');
		}
		if (mergeRequest.sha !== headCommitSha) throw new ConflictError(CHANGED_ON_HOST);

		const claimedAt = new Date();
		const staleBefore = new Date(claimedAt.getTime() - APPROVAL_CLAIM_TTL_MS);
		if (!(await this.reviewRepository.claimApproval(review.id, user.id, claimedAt, staleBefore))) {
			throw new ConflictError('Another owner or admin is approving this promotion review.');
		}

		let merged: GitLabMergeRequest;
		try {
			await this.mergeRequests.approve(access, ref, headCommitSha).catch((error: unknown) => {
				// GitLab refuses a second approval, and an approval by the author. The merge decides.
				if (!(error instanceof BadRequestError)) throw error;
				// The message can quote the GitLab response, so log only the error class.
				this.logger.info('GitLab did not accept the approval', {
					reviewId,
					error: error.constructor.name,
				});
			});
			merged = await this.mergeRequests.merge(access, ref, headCommitSha);
		} catch (error) {
			await this.reviewRepository.releaseApproval(review.id, user.id, claimedAt);
			throw error instanceof ConflictError ? new ConflictError(CHANGED_ON_HOST) : error;
		}

		await this.applyHostState(review, merged);
		// A sync can record the merge first. Then the guarded write changes nothing.
		review.state = toReviewState(merged);
		Object.assign(review, { approvedById: user.id, approvedBy: user, approvedAt: claimedAt });
		// The merge is done, so a failed note must not fail the approval.
		await this.mergeRequests.createNote(access, ref, approvalNote(user)).catch((error: unknown) => {
			this.logger.warn('Could not post the approval note on GitLab', {
				reviewId,
				error: error instanceof Error ? error.constructor.name : typeof error,
			});
		});
		return toItem(review, run, { mergeRequest: merged, remoteError: null });
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
		// Most reviews share one environment, so a batch reads and decrypts each provider once.
		const accessCache: AccessCache = new Map();
		const views = await Promise.all(
			reviews.map(async (review) => await this.readOne(review, runs.get(review.id), accessCache)),
		);
		return new Map(reviews.map(({ id }, index) => [id, views[index]]));
	}

	private async readOne(
		review: PromotionReview,
		run: PromotionRun | undefined,
		accessCache: AccessCache,
	): Promise<RemoteView> {
		try {
			const host = await this.readMergeRequest(review, run, accessCache);
			return host
				? { mergeRequest: host.mergeRequest, remoteError: null }
				: failed('no_connection');
		} catch (error) {
			return failed(remoteErrorOf(error));
		}
	}

	/** NULL when no host can be resolved. Throws the host errors. */
	private async readMergeRequest(
		{ type, environment, remoteReviewId }: PromotionReview,
		run: PromotionRun | undefined,
		accessCache: AccessCache = new Map(),
	) {
		if (!environment || !remoteReviewId) return null;
		const key = `${environment.id}:${type}`;
		let resolving = accessCache.get(key);
		if (!resolving) {
			resolving = this.hostResolver.resolveForEnvironment(environment, type);
			accessCache.set(key, resolving);
		}
		const access = await resolving;
		if (!access) return null;
		const ref = parseGitLabReviewId(remoteReviewId);
		const mergeRequest = await this.mergeRequests.getMergeRequest(access, ref);
		// The stored ids are not unique across hosts. Only the branch n8n pushed proves it is ours.
		if (mergeRequest.source_branch !== detailsOf(run)?.branchName) {
			throw new NotFoundError('GitLab could not find the merge request of this promotion.');
		}
		return { access, ref, mergeRequest };
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

const detailsOf = (run: PromotionRun | undefined) => {
	if (!run) return null;
	const parsed = promotionRunDetailsSchemas[run.type].safeParse(run.details);
	return parsed.success ? parsed.data : null;
};

const toItem = (
	review: PromotionReview,
	run: PromotionRun | undefined,
	{ mergeRequest, remoteError }: RemoteView,
): InboxPromotionReviewItem => {
	const details = detailsOf(run);
	return {
		type: 'promotion_review',
		id: review.id,
		state: review.state === 'merged' || review.state === 'closed' ? 'closed' : 'open',
		reviewState: review.state,
		title: mergeRequest?.title ?? null,
		webUrl: mergeRequest?.web_url ?? null,
		branchName: details?.branchName ?? null,
		environmentName: run?.environment?.name ?? null,
		requester: toReviewUser(review.createdBy),
		approver: toReviewUser(review.approvedBy),
		remoteError,
		headCommitSha: mergeRequest?.sha ?? null,
		runCommitSha: details?.commitSha ?? null,
		hasConflicts: mergeRequest?.has_conflicts ?? false,
		createdAt: review.createdAt.toISOString(),
		updatedAt: (review.lastStateChangeAt ?? review.createdAt).toISOString(),
	};
};
