import {
	parseRemoteReviewId,
	promotionReviewTypeSchema,
	type PromotionMergeRequestResult,
	type PromotionPromoteWarning,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BaseError } from '@n8n/errors';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { v7 as uuidv7 } from 'uuid';

import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
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
	/** Lines after the title. Leave this empty for a one-line message. */
	body?: string;
}>;

export type OpenReviewResult = Readonly<{
	mergeRequest?: PromotionMergeRequestResult;
	warnings: PromotionPromoteWarning[];
}>;

/** Opens a GitLab merge request for a promotion branch and records the review. */
@Service()
export class PromotionReviewsService {
	constructor(
		private readonly runRepository: PromotionRunRepository,
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly txRunner: TransactionRunner,
		private readonly hostResolver: PromotionReviewHostResolver,
		private readonly mergeRequests: GitLabMergeRequestClient,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/** A failure is a warning. The push already succeeded, so this does not throw. */
	async openMergeRequest(
		input: PromotionOperationInput,
		actor: User,
		{ branchName, baseBranchName, commitSha, title, body }: PromotionPush,
		runId: string,
	): Promise<OpenReviewResult> {
		const host = await settle(async () => await this.hostResolver.resolve(input));
		if (!host.ok) {
			this.logger.warn('Could not prepare the GitLab merge request call', { error: host.error });
			return { warnings: [mergeRequestWarning(host.error)] };
		}
		if (!host.result) return { warnings: [] };
		const { access, projectPath } = host.result;

		const mergeRequest = await settle(
			async () =>
				await this.mergeRequests.createMergeRequest(access, {
					projectPath,
					sourceBranch: branchName,
					targetBranch: baseBranchName,
					title,
					description: this.mergeRequestDescription(actor, commitSha, body),
				}),
		);
		if (!mergeRequest.ok) {
			this.logger.warn('Could not open the GitLab merge request', { error: mergeRequest.error });
			return { warnings: [mergeRequestWarning(mergeRequest.error)] };
		}
		const { iid, project_id: projectId, web_url: webUrl } = mergeRequest.result;

		const reviewId = uuidv7();
		const type = promotionReviewTypeSchema.parse('gitlab');
		const review = await settle(
			async () =>
				await this.txRunner.run({}, async (ctx) => {
					await this.reviewRepository.insertReview(
						{
							id: reviewId,
							connectionId: input.connectionId,
							type,
							remoteReviewId: parseRemoteReviewId(type, toGitLabReviewId({ projectId, iid })),
							createdById: actor.id,
						},
						ctx,
					);
					// The branch and commit live on the run. A review without that link cannot be shown.
					await this.runRepository.attachReview(runId, reviewId, ctx);
				}),
		);
		if (!review.ok) {
			this.logger.warn('Could not record the promotion review', { error: review.error, reviewId });
			return {
				warnings: [
					{
						message: `The merge request ${webUrl} was opened, but n8n could not record the review. Review it on GitLab.`,
						linkUrl: webUrl,
					},
				],
			};
		}

		return { mergeRequest: { reviewId, iid, webUrl }, warnings: [] };
	}

	private mergeRequestDescription(actor: User, commitSha: string, body = '') {
		const lead = body.replace(/^\n+/, '').replace(/\n+$/, '');
		const attribution = [
			`Opened by n8n for a promotion by ${displayName(actor)}.`,
			'',
			`Commit: ${commitSha}`,
		];
		return escapeGitLabQuickActions((lead ? [lead, '', ...attribution] : attribution).join('\n'));
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

const displayName = ({ firstName, lastName, id }: User) =>
	[firstName, lastName].filter(Boolean).join(' ') || id;

/** A line that starts with `/` would run as a GitLab quick action under the token. */
const escapeGitLabQuickActions = (text: string) =>
	text
		.split('\n')
		.map((line) => line.replace(/^(\s*)\//, '$1\\/'))
		.join('\n');

const mergeRequestWarning = (error: unknown): PromotionPromoteWarning => {
	const prefix = 'No merge request was opened';
	// A raw Error can carry request details. Only an n8n error has a message safe to show.
	const message = error instanceof BaseError ? `${prefix}: ${error.message}` : `${prefix}.`;
	return { message };
};
