import {
	promotionRunDetailsSchemas,
	type ApprovePromotionReviewDto,
	type InboxCounts,
	type InboxPromotionReviewItem,
	type PromotionReviewRemoteError,
	type PromotionReviewState,
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ServiceUnavailableError,
	TooManyRequestsError,
} from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { singleFlight } from '@n8n/utils/promise/single-flight';

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import type { PromotionRun } from './database/entities/promotion-run.entity';
import {
	PromotionReviewRepository,
	type ApprovalClaim,
} from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import type { GitHostAccess } from './git-hosts/git-host.types';
import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
} from './git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest, MergeRequestRef } from './git-hosts/gitlab-merge-request.types';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';
import { observePromotion } from './promotion-telemetry';
import { approvalNote } from './promotion-review.utils';

/** One live look at a review on the host. A failed read says why, and never a state. */
export type LiveReviewState =
	| { ok: true; state: PromotionReviewState }
	| { ok: false; remoteError: PromotionReviewRemoteError };

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

const UNCONFIRMED_MERGE =
	"GitLab didn't confirm the merge. Check the merge request on GitLab, then try again in two minutes.";

/**
 * Promotion Reviews as an Inbox source, and their approval. The first page of each tab and
 * the counters share one sync of the open reviews with the Git host. An Inbox sync failure
 * never changes the review state.
 */
@Service()
export class PromotionReviewInboxService {
	private readonly syncOnce = singleFlight(async () => await this.syncOpenReviews());

	private readonly liveReads = new Map<string, Promise<LiveReviewState>>();

	constructor(
		private readonly licenseState: LicenseState,
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly runRepository: PromotionRunRepository,
		private readonly hostResolver: PromotionReviewHostResolver,
		private readonly mergeRequests: GitLabMergeRequestClient,
		private readonly eventService: EventService,
		private readonly logger: Logger,
		private readonly sourceControlPreferences: SourceControlPreferencesService,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	isEnabled() {
		return (
			this.licenseState.isLicensed(LICENSE_FEATURES.PROMOTIONS) &&
			this.sourceControlPreferences.getPreferences().environmentsVersion === 'v2'
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
	 * One live look at a review on the host. A merged or closed review is recorded the same way
	 * as in the Inbox sync, so the next caller finds the new state without a host call. Callers
	 * that ask for the same review at the same time share one host call. `runs` are the runs of
	 * this review that the caller already loaded.
	 */
	async refreshState(
		review: PromotionReview,
		runs: PromotionRun[],
		{ timeoutMs }: { timeoutMs: number },
	): Promise<LiveReviewState> {
		const inFlight = this.liveReads.get(review.id);
		if (inFlight) return await inFlight;
		const read = this.readLive(review, runs, timeoutMs).finally(() =>
			this.liveReads.delete(review.id),
		);
		this.liveReads.set(review.id, read);
		return await read;
	}

	private async readLive(
		review: PromotionReview,
		runs: PromotionRun[],
		timeoutMs: number,
	): Promise<LiveReviewState> {
		const run = newestFirst(runs)[0];
		const { mergeRequest, remoteError } = await this.readOne(review, run, new Map(), timeoutMs);
		if (!mergeRequest) return { ok: false, remoteError: remoteError ?? 'unreachable' };
		try {
			await this.applyHostState(review, mergeRequest);
		} catch {
			// The host answer is right for this call. The Inbox sync records the state later.
		}
		return { ok: true, state: toReviewState(mergeRequest) };
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
		if (!this.isEnabled()) throw new ForbiddenError("Promotion reviews aren't enabled.");
		const review = await this.reviewRepository.findByIdWithRelations(reviewId);
		if (!review) throw new NotFoundError('Promotion review not found.');

		return await observePromotion(
			async () => await this.approveReview(user, review, headCommitSha),
			(observed) =>
				this.eventService.emit('promotion-review-approved', {
					user,
					reviewId: review.id,
					environmentId: review.environmentId,
					reviewType: review.type,
					reviewAgeMs: Date.now() - review.createdAt.getTime(),
					outcome: observed.ok ? 'merged' : 'failed',
					...(!observed.ok && { failureKind: observed.failureKind }),
					durationMs: observed.durationMs,
				}),
		);
	}

	private async approveReview(
		user: User,
		review: PromotionReview,
		headCommitSha: string,
	): Promise<InboxPromotionReviewItem> {
		const reviewId = review.id;
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
			throw new ConflictError(
				'A reviewer requested changes. Resolve them on GitLab, then reload the Inbox.',
			);
		}
		if (hostState !== 'open') {
			throw new ConflictError(`The merge request is already ${hostState} on GitLab.`);
		}
		if (mergeRequest.has_conflicts) {
			throw new ConflictError('The merge request has conflicts. Resolve them on GitLab.');
		}
		if (mergeRequest.sha !== headCommitSha) throw new ConflictError(CHANGED_ON_HOST);

		const claim: ApprovalClaim = {
			reviewId: review.id,
			approvedById: user.id,
			approvedAt: new Date(),
		};
		const staleBefore = new Date(claim.approvedAt.getTime() - APPROVAL_CLAIM_TTL_MS);
		if (!(await this.reviewRepository.claimApproval(claim, staleBefore))) {
			throw new ConflictError(
				'Someone is already approving this promotion review. Wait for the approval to finish, then reload the Inbox.',
			);
		}

		const merged = await this.mergeClaimed(claim, access, ref, headCommitSha);
		await this.applyHostState(review, merged);
		// A sync can record the merge first. Then the guarded write changes nothing.
		review.state = toReviewState(merged);
		Object.assign(review, {
			approvedById: user.id,
			approvedBy: user,
			approvedAt: claim.approvedAt,
		});
		// The merge is done, so a failed note must not fail the approval.
		await this.mergeRequests.createNote(access, ref, approvalNote(user)).catch((error: unknown) => {
			this.logger.warn('Could not post the approval note on GitLab', {
				reviewId,
				error: error instanceof Error ? error.constructor.name : typeof error,
			});
		});
		return toItem(review, run, { mergeRequest: merged, remoteError: null });
	}

	/**
	 * Approves and merges on the host under a claim. The claim is released only when the host
	 * surely did not merge. A lost merge answer keeps it, so the next sync records the merge
	 * with this approver.
	 */
	private async mergeClaimed(
		claim: ApprovalClaim,
		access: GitHostAccess,
		ref: MergeRequestRef,
		sha: string,
	): Promise<GitLabMergeRequest> {
		let merging = false;
		try {
			await this.mergeRequests.approve(access, ref, sha).catch((error: unknown) => {
				// The GitLab approval is best effort. A real problem also fails the merge, which reports it.
				if (!(error instanceof BadRequestError)) throw error;
				// Log only the error type. Its message can contain text from GitLab's response.
				this.logger.info('GitLab did not accept the approval', {
					reviewId: claim.reviewId,
					error: error.constructor.name,
				});
			});
			merging = true;
			return await this.mergeRequests.merge(access, ref, sha);
		} catch (error) {
			// Only the merge call can fail after GitLab merged, for example on a timeout.
			if (merging && !isRefusal(error)) {
				const current = await this.mergeRequests.getMergeRequest(access, ref).catch(() => null);
				if (current?.state === 'merged') return current;
				throw new ServiceUnavailableError(UNCONFIRMED_MERGE);
			}
			await this.reviewRepository.releaseApproval(claim);
			throw error instanceof ConflictError ? new ConflictError(CHANGED_ON_HOST) : error;
		}
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
		for (const run of newestFirst(runs)) {
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
		timeoutMs?: number,
	): Promise<RemoteView> {
		try {
			const host = await this.readMergeRequest(review, run, accessCache, timeoutMs);
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
		timeoutMs?: number,
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
		const mergeRequest = await this.mergeRequests.getMergeRequest(access, ref, { timeoutMs });
		// The stored ids are not unique across hosts. Only the branch n8n pushed proves it is ours.
		if (mergeRequest.source_branch !== detailsOf(run)?.branchName) {
			throw new NotFoundError("GitLab couldn't find the merge request of this promotion.");
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

const canRead = (user: User) => hasGlobalScope(user, 'promotions:readReviews');

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

/** GitLab answered and did not merge. A timeout or a 5xx answer leaves the outcome unknown. */
const isRefusal = (error: unknown) =>
	error instanceof BadRequestError ||
	error instanceof ConflictError ||
	error instanceof NotFoundError ||
	error instanceof TooManyRequestsError;

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

const newestFirst = (runs: PromotionRun[]) =>
	runs.toSorted(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
	);

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
		reviewType: review.type,
		title: mergeRequest?.title ?? null,
		webUrl: mergeRequest?.web_url ?? null,
		branchName: details?.branchName ?? null,
		environmentName: run?.environment?.name ?? null,
		requester: toReviewUser(review.createdBy),
		// On other states, approvedBy is a claim in progress or one that a stopped request left.
		approver: review.state === 'merged' ? toReviewUser(review.approvedBy) : null,
		remoteError,
		headCommitSha: mergeRequest?.sha ?? null,
		runCommitSha: details?.commitSha ?? null,
		hasConflicts: mergeRequest?.has_conflicts ?? false,
		createdAt: review.createdAt.toISOString(),
		updatedAt: (review.lastStateChangeAt ?? review.createdAt).toISOString(),
	};
};
