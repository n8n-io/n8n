import {
	promotionRunDetailsSchemas,
	type ApprovePromotionReviewDto,
	type InboxCounts,
	type InboxPromotionReviewItem,
	type ListPromotionReviewsQueryDto,
	type PromotionReviewViewerApproval,
	type PromotionReviewItem,
	type PromotionReviewRemoteError,
	type PromotionReviewState,
	promotionReviewTabSchema,
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { accountSummary } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ServiceUnavailableError,
	TooManyRequestsError,
} from '@n8n/errors';
import { GLOBAL_ADMIN_ROLE_SLUG, GLOBAL_OWNER_ROLE_SLUG, hasGlobalScope } from '@n8n/permissions';
import { singleFlight } from '@n8n/utils/promise/single-flight';
import { z } from 'zod';

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { ProjectService } from '@/services/project.service.ee';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import type { PromotionRun } from './database/entities/promotion-run.entity';
import {
	PromotionReviewRepository,
	type ApprovalClaim,
	type PromotionReviewVisibility,
} from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import type { GitHostAccess } from './git-hosts/git-host.types';
import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
} from './git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest, MergeRequestRef } from './git-hosts/gitlab-merge-request.types';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';
import { observePromotion, type ClosedHostStatus } from './promotion-telemetry';
import { approvalNote } from './promotion-review.utils';
import type { PromotionReviewCloseReason } from './promotions.types';

/** One live look at a review on the host. A failed read says why, and never a state. */
export type LiveReviewState =
	| { ok: true; state: PromotionReviewState }
	| { ok: false; remoteError: PromotionReviewRemoteError };

type RemoteView = Readonly<{
	mergeRequest: GitLabMergeRequest | null;
	remoteError: PromotionReviewRemoteError | null;
}>;

/**
 * What one user can do with promotion reviews, read once for each request. The instance role
 * covers every review. A project role covers the reviews of its project.
 */
type ReviewAccess = Readonly<{
	userId: string;
	/** Instance owners and admins can approve a review that holds their own promotion run. */
	isInstanceAdmin: boolean;
	instanceRead: boolean;
	instanceApprove: boolean;
	readProjectIds: ReadonlySet<string>;
	approveProjectIds: ReadonlySet<string>;
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
 * the counters share one sync of the open reviews with the Git host. A failed host read
 * never changes the review state. A review whose environment is gone, or no longer uses its
 * host, can never merge, so the sync closes it.
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
		private readonly projectService: ProjectService,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	isEnabled() {
		return (
			this.licenseState.isLicensed(LICENSE_FEATURES.PROMOTIONS) &&
			this.sourceControlPreferences.getPreferences().environmentsVersion === 'v2'
		);
	}

	private assertEnabled() {
		if (!this.isEnabled()) throw new ForbiddenError("Promotion reviews aren't enabled.");
	}

	async listForInbox(user: User, query: InboxSourceQuery): Promise<InboxPromotionReviewItem[]> {
		const access = await this.accessOf(user);
		const visibility = visibilityOf(access);
		if (!visibility) return [];
		// A sync during "Load more" could move a review above the cursor, where the user never sees it.
		const synced = query.boundary ? new Map<string, RemoteView>() : await this.syncOnce();
		const reviews = await this.reviewRepository.findForInbox(query, visibility);
		const runs = await this.runsOf(reviews);
		const read = await this.readRemote(
			reviews.filter(({ id }) => !synced.has(id)),
			runs,
		);

		return reviews.map((review) =>
			toItem(
				review,
				runs.get(review.id) ?? [],
				synced.get(review.id) ?? read.get(review.id) ?? { mergeRequest: null, remoteError: null },
				access,
			),
		);
	}

	/**
	 * One page of the reviews that the Inbox of the user shows, for the public API. Pages with
	 * the order of the Inbox, so a sync on the first page does not skip or repeat a review.
	 */
	async listPage(
		user: User,
		{ state, limit, cursor }: ListPromotionReviewsQueryDto,
	): Promise<{ data: PromotionReviewItem[]; nextCursor: string | null }> {
		this.assertEnabled();
		const after = cursor ? decodeCursor(cursor, state) : undefined;
		const items = await this.listForInbox(user, {
			state,
			limit: limit + 1,
			boundary: after && { mode: 'afterItem', updatedAt: new Date(after.updatedAt), id: after.id },
		});
		const data = items.slice(0, limit).map(toPublicItem);
		const last = data.at(-1);
		return {
			data,
			nextCursor:
				items.length > limit && last
					? encodeCursor({ state, updatedAt: last.updatedAt, id: last.id })
					: null,
		};
	}

	/** One review that the Inbox of the user shows. Reads the host now, as the Inbox sync does. */
	async getForUser(user: User, reviewId: string): Promise<PromotionReviewItem> {
		const { review, access } = await this.findReadableReview(user, reviewId);
		const runs = newestFirst(review.runs);
		const view = await this.readOne(review, runs[0], new Map());
		if (view.mergeRequest) await this.applyHostState(review, view.mergeRequest);
		return toPublicItem(toItem(review, runs, view, access));
	}

	async countForInbox(user: User): Promise<InboxCounts> {
		const visibility = visibilityOf(await this.accessOf(user));
		if (!visibility) return { open: 0, closed: 0 };
		await this.syncOnce();
		return await this.reviewRepository.countForInbox(visibility);
	}

	/**
	 * Loads one review that the Inbox of the user shows. A review that the Inbox hides reads as
	 * missing, as in the list, so its id tells nothing.
	 */
	async findReadableReview(
		user: User,
		reviewId: string,
	): Promise<{ review: PromotionReview; access: ReviewAccess }> {
		this.assertEnabled();
		const access = await this.accessOf(user);
		const review = await this.reviewRepository.findByIdWithRelations(reviewId);
		if (!review || !canReadReview(access, review)) {
			throw new NotFoundError('Promotion review not found.');
		}
		return { review, access };
	}

	/** Whether the user can open the review in the Inbox. The preview blocker links to it. */
	async canOpenReview(user: User, review: PromotionReview): Promise<boolean> {
		return canReadReview(await this.accessOf(user), review);
	}

	private async accessOf(user: User): Promise<ReviewAccess> {
		const instanceRead = hasGlobalScope(user, 'promotions:readReviews');
		const instanceApprove = hasGlobalScope(user, 'promotions:approveReviews');
		// With the scope in the instance role, the project lookup would return every project.
		const [readProjectIds, approveProjectIds] = await Promise.all([
			instanceRead
				? []
				: this.projectService.getProjectIdsWithScope(user, ['promotions:readReviews']),
			instanceApprove
				? []
				: this.projectService.getProjectIdsWithScope(user, ['promotions:approveReviews']),
		]);
		return {
			userId: user.id,
			isInstanceAdmin:
				user.role.slug === GLOBAL_OWNER_ROLE_SLUG || user.role.slug === GLOBAL_ADMIN_ROLE_SLUG,
			instanceRead,
			instanceApprove,
			readProjectIds: new Set(readProjectIds),
			approveProjectIds: new Set(approveProjectIds),
		};
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
		const { review, access } = await this.findReadableReview(user, reviewId);
		// Before the event and the host call, so a refused approval sends neither. The state is
		// checked later, so an ended review answers with a conflict.
		const eligibility = eligibilityOf(access, review, review.runs);
		if (eligibility === 'notAllowed') {
			throw new ForbiddenError("You can't approve the promotion reviews of this project.");
		}
		if (eligibility === 'madeRun') {
			throw new ForbiddenError(
				"You made a promotion run in this review, so you can't approve it. Ask another approver.",
			);
		}

		return await observePromotion(
			async () => await this.approveReview(user, review, headCommitSha, access),
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

	/**
	 * Closes the review within n8n. Reads the host first and records merged or closed states.
	 * Allows the close when the merge request is missing, or the host configuration is invalid or
	 * absent. Refuses transient host failures.
	 */
	async close(user: User, reviewId: string): Promise<InboxPromotionReviewItem> {
		const { review, access } = await this.findReadableReview(user, reviewId);
		if (!canClose(access, review)) {
			throw new ForbiddenError('Only the requester and the approvers of this review can close it.');
		}

		// Stays null when the close fails before n8n asks the host.
		let hostStatus: ClosedHostStatus | null = null;
		return await observePromotion(
			async () => await this.closeReview(review, access, (status) => (hostStatus = status)),
			(observed) =>
				this.eventService.emit('promotion-review-closed', {
					user,
					reviewId: review.id,
					environmentId: review.environmentId,
					reviewType: review.type,
					reviewAgeMs: Date.now() - review.createdAt.getTime(),
					hostStatus,
					outcome: observed.ok ? 'closed' : 'failed',
					...(!observed.ok && { failureKind: observed.failureKind }),
					durationMs: observed.durationMs,
				}),
		);
	}

	private async closeReview(
		review: PromotionReview,
		access: ReviewAccess,
		onHostStatus: (status: ClosedHostStatus) => void,
	): Promise<InboxPromotionReviewItem> {
		if (review.state === 'merged' || review.state === 'closed') {
			throw new ConflictError(
				`This promotion review is already ${review.state}. Reload the Inbox.`,
			);
		}

		const runs = newestFirst(review.runs);
		let view: RemoteView = failed('no_connection');
		try {
			const host = await this.readMergeRequest(review, runs[0]);
			if (host) view = { mergeRequest: host.mergeRequest, remoteError: null };
		} catch (error) {
			// An unexpected error, such as an invalid GitLab response, is a bug and must not read as a host outage.
			if (!isHostAccessError(error)) throw error;
			view = failed(remoteErrorOf(error));
		}
		const { mergeRequest, remoteError } = view;

		if (mergeRequest) {
			await this.applyHostState(review, mergeRequest);
			const hostState = toReviewState(mergeRequest);
			onHostStatus(hostState);
			if (hostState === 'merged' || hostState === 'closed') {
				throw new ConflictError(
					`The merge request is already ${hostState} on GitLab. Reload the Inbox.`,
				);
			}
		} else if (remoteError) {
			onHostStatus(remoteError);
			if (remoteError === 'unreachable') {
				throw new ServiceUnavailableError("GitLab didn't answer. Try again.");
			}
		}

		const at = new Date();
		const staleBefore = new Date(at.getTime() - APPROVAL_CLAIM_TTL_MS);
		if (!(await this.reviewRepository.closeByUser(review.id, at, staleBefore, {}))) {
			const current = await this.reviewRepository.findByIdWithRelations(review.id);
			if (current?.state === 'merged' || current?.state === 'closed') {
				throw new ConflictError(
					`This promotion review is already ${current.state}. Reload the Inbox.`,
				);
			}
			throw new ConflictError(
				'Someone is approving this promotion review. Wait for the approval to finish, then reload the Inbox.',
			);
		}
		review.state = 'closed';
		review.lastStateChangeAt = at;
		return toItem(review, runs, view, access);
	}

	private async approveReview(
		user: User,
		review: PromotionReview,
		headCommitSha: string,
		viewer: ReviewAccess,
	): Promise<InboxPromotionReviewItem> {
		const reviewId = review.id;
		if (review.state === 'merged' || review.state === 'closed') {
			throw new ConflictError(`This promotion review is already ${review.state}.`);
		}

		const runs = newestFirst(review.runs);
		const host = await this.readMergeRequest(review, runs[0]);
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
		return toItem(review, runs, { mergeRequest: merged, remoteError: null }, viewer);
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
		const views = await this.readRemote(reviews, await this.runsOf(reviews));
		for (const review of reviews) {
			const view = views.get(review.id);
			if (view?.mergeRequest) await this.applyHostState(review, view.mergeRequest);
			else if (view?.remoteError === 'no_connection') await this.closeUnreachable(review);
		}
		return views;
	}

	/**
	 * The runs of each review in a list, newest first. The newest run carries the branch and the
	 * commit. A single review loads its runs with the review.
	 */
	private async runsOf(reviews: PromotionReview[]): Promise<Map<string, PromotionRun[]>> {
		const runs = await this.runRepository.findByReviewIds(reviews.map(({ id }) => id));
		const byReview = new Map<string, PromotionRun[]>();
		for (const run of newestFirst(runs)) {
			if (!run.reviewId) continue;
			byReview.set(run.reviewId, [...(byReview.get(run.reviewId) ?? []), run]);
		}
		return byReview;
	}

	private async readRemote(
		reviews: PromotionReview[],
		runs: Map<string, PromotionRun[]>,
	): Promise<Map<string, RemoteView>> {
		// Most reviews share one environment, so a batch reads and decrypts each provider once.
		const accessCache: AccessCache = new Map();
		const views = await Promise.all(
			reviews.map(
				async (review) => await this.readOne(review, runs.get(review.id)?.[0], accessCache),
			),
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

	/** Only a review on a host can lose it. A review that lives in n8n stays open. */
	private async closeUnreachable(review: PromotionReview) {
		if (!review.remoteReviewId) return;
		const at = new Date();
		if (!(await this.reviewRepository.recordHostState(review.id, 'closed', at))) return;
		review.state = 'closed';
		review.lastStateChangeAt = at;
		const reason: PromotionReviewCloseReason = review.environment
			? 'environment_host_changed'
			: 'environment_deleted';
		this.logger.info('Closed a promotion review that can no longer reach its host', {
			reviewId: review.id,
			environmentId: review.environmentId,
			reason,
		});
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

/** NULL when the user can read no review. */
const visibilityOf = (access: ReviewAccess): PromotionReviewVisibility | null => {
	if (access.instanceRead) return { scope: 'all' };
	if (access.readProjectIds.size === 0) return null;
	return { scope: 'projects', projectIds: [...access.readProjectIds] };
};

/** A review without a project holds a promotion of the whole instance. It needs the instance role. */
const coversReview = (
	instance: boolean,
	projectIds: ReadonlySet<string>,
	review: PromotionReview,
) => instance || (review.projectId !== null && projectIds.has(review.projectId));

const canReadReview = (access: ReviewAccess, review: PromotionReview) =>
	coversReview(access.instanceRead, access.readProjectIds, review);

const isApprover = (access: ReviewAccess, review: PromotionReview) =>
	coversReview(access.instanceApprove, access.approveProjectIds, review);

const isFinished = (review: PromotionReview) =>
	review.state === 'merged' || review.state === 'closed';

/**
 * Whether the user may approve the review, whatever its state. Nobody who made a run in a
 * review can approve it, except instance owners and admins.
 */
const eligibilityOf = (
	access: ReviewAccess,
	review: PromotionReview,
	runs: PromotionRun[],
): PromotionReviewViewerApproval => {
	if (!isApprover(access, review)) return 'notAllowed';
	const madeRun = runs.some((run) => run.createdById === access.userId);
	return madeRun && !access.isInstanceAdmin ? 'madeRun' : 'allowed';
};

/** What the Inbox shows. An ended review has nothing left to approve. */
const approvalOf = (access: ReviewAccess, review: PromotionReview, runs: PromotionRun[]) =>
	isFinished(review) ? 'notAllowed' : eligibilityOf(access, review, runs);

const canClose = (access: ReviewAccess, review: PromotionReview) =>
	review.createdById === access.userId || isApprover(access, review);

const toPublicItem = ({
	type: _,
	viewerApproval: __,
	viewerCanClose: ___,
	...review
}: InboxPromotionReviewItem): PromotionReviewItem => review;

/** The last review of a page. The next page starts after it in the Inbox order. */
const cursorSchema = z
	.object({
		state: promotionReviewTabSchema,
		updatedAt: z.string().datetime(),
		id: z.string().uuid(),
	})
	.strict();
type ReviewCursor = z.infer<typeof cursorSchema>;

const encodeCursor = (cursor: ReviewCursor) =>
	Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const decodeCursor = (cursor: string, state: ReviewCursor['state']): ReviewCursor => {
	try {
		const parsed = cursorSchema.parse(
			JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
		);
		// A cursor of the other tab would start the page at a review of that tab.
		if (parsed.state === state) return parsed;
	} catch {
		// Not a cursor that this list wrote. The error below answers it.
	}
	throw new BadRequestError('An invalid cursor was provided');
};

const failed = (remoteError: PromotionReviewRemoteError): RemoteView => ({
	mergeRequest: null,
	remoteError,
});

/** The errors that the GitLab client throws when it cannot read the merge request. */
const isHostAccessError = (error: unknown) =>
	error instanceof NotFoundError ||
	error instanceof BadRequestError ||
	error instanceof ServiceUnavailableError ||
	error instanceof TooManyRequestsError;

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

const toReviewUser = (user: User | null) => (user ? accountSummary(user) : null);

const newestFirst = (runs: PromotionRun[]) =>
	runs.toSorted(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
	);

const detailsOf = (run: PromotionRun | undefined) => {
	if (!run) return null;
	const parsed = promotionRunDetailsSchemas[run.type].safeParse(run.details);
	return parsed.success ? parsed.data : null;
};

/** `runs` are newest first. */
const toItem = (
	review: PromotionReview,
	runs: PromotionRun[],
	{ mergeRequest, remoteError }: RemoteView,
	access: ReviewAccess,
): InboxPromotionReviewItem => {
	const run = runs[0];
	const details = detailsOf(run);
	return {
		type: 'promotion_review',
		viewerApproval: approvalOf(access, review, runs),
		viewerCanClose: !isFinished(review) && canClose(access, review),
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
