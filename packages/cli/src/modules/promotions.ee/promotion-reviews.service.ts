import type { PromotionMergeRequestResult } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';

import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import {
	GitLabMergeRequestClient,
	toGitLabReviewId,
} from './git-hosts/gitlab-merge-request.client';
import { PromotionReviewHostResolver } from './promotion-review-host.resolver';
import type { PromotionOperationInput } from './promotions.types';

/** What Promote pushed, as the hook needs it. */
export type PromotionPush = Readonly<{
	/** The promotion branch that was pushed; the merge request source. */
	branchName: string;
	/** The configured base branch; the merge request target. */
	baseBranchName: string;
	commitSha: string;
	title: string;
}>;

export type OpenReviewResult = Readonly<{
	mergeRequest?: PromotionMergeRequestResult;
	warnings: string[];
}>;

/**
 * Promotion Reviews on top of GitLab merge requests. Opens the merge request
 * after a branched Promote and records the review. GitLab is authoritative while
 * a review is open; the row is authoritative once terminal.
 */
@Service()
export class PromotionReviewsService {
	constructor(
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly hostResolver: PromotionReviewHostResolver,
		private readonly mergeRequests: GitLabMergeRequestClient,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/**
	 * Opens the merge request for a pushed promotion branch and records the review.
	 * The push already succeeded, so nothing here throws: a failure is a warning for
	 * the caller, and the admin can finish the step on GitLab by hand.
	 */
	async openMergeRequest(
		input: PromotionOperationInput,
		actor: User,
		{ branchName, baseBranchName, commitSha, title }: PromotionPush,
	): Promise<OpenReviewResult> {
		const host = await settle(async () => await this.hostResolver.resolve(input));
		if (!host.ok) {
			this.logger.warn('Could not prepare the GitLab merge request call', { error: host.error });
			return { warnings: [mergeRequestWarning(branchName, host.error)] };
		}
		if (!host.result) return { warnings: [] };
		const { access, projectPath } = host.result;

		// The id exists before the row, so the merge request can link to the review.
		const reviewId = generateNanoId();

		const mergeRequest = await settle(
			async () =>
				await this.mergeRequests.createMergeRequest(access, {
					projectPath,
					sourceBranch: branchName,
					targetBranch: baseBranchName,
					title,
					description: this.mergeRequestDescription(actor, commitSha, reviewId),
				}),
		);
		if (!mergeRequest.ok) {
			this.logger.warn('Could not open the GitLab merge request', { error: mergeRequest.error });
			return { warnings: [mergeRequestWarning(branchName, mergeRequest.error)] };
		}
		const { iid, project_id: projectId, web_url: webUrl } = mergeRequest.result;

		const review = await settle(
			async () =>
				await this.reviewRepository.insertReview({
					id: reviewId,
					connectionId: input.connectionId,
					createdById: actor.id,
					branchName,
					commitSha,
					remoteReviewId: toGitLabReviewId({ projectId, iid }),
				}),
		);
		if (!review.ok) {
			this.logger.warn('Could not record the promotion review', { error: review.error, reviewId });
			return {
				warnings: [
					`The merge request ${webUrl} was opened, but n8n could not record the review. Review it on GitLab.`,
				],
			};
		}

		return { mergeRequest: { reviewId, iid, webUrl }, warnings: [] };
	}

	private mergeRequestDescription(actor: User, commitSha: string, reviewId: string) {
		const reviewUrl = `${this.urlService.getInstanceBaseUrl()}/reviews/promotion:${reviewId}`;
		return [
			`Opened by n8n for a promotion by ${displayName(actor)}.`,
			'',
			`Commit: ${commitSha}`,
			'',
			`Review in n8n: ${reviewUrl}`,
		].join('\n');
	}
}

/** Runs one step and returns a Result, so a failed step returns instead of throwing. */
const settle = async <T>(run: () => Promise<T>): Promise<Result<T, unknown>> => {
	try {
		return createResultOk(await run());
	} catch (error) {
		return createResultError(error);
	}
};

const displayName = ({ firstName, lastName, email, id }: User) =>
	[firstName, lastName].filter(Boolean).join(' ') || email || id;

const mergeRequestWarning = (branchName: string, error: unknown) => {
	const reason = error instanceof Error ? error.message : 'Unknown error';
	return `The branch ${branchName} was pushed, but no merge request was opened: ${reason}`;
};
