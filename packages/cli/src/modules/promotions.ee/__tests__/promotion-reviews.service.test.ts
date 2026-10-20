import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ServiceUnavailableError } from '@n8n/errors';

import type { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import type { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import type { GitLabMergeRequestClient } from '../git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest } from '../git-hosts/gitlab-merge-request.types';
import type { PromotionReviewHostResolver } from '../promotion-review-host.resolver';
import { PromotionReviewsService } from '../promotion-reviews.service';
import type { PromotionOperationInput } from '../promotions.types';

describe('PromotionReviewsService', () => {
	const runRepository = mock<PromotionRunRepository>();
	const reviewRepository = mock<PromotionReviewRepository>();
	const txRunner = mock<TransactionRunner>();
	const hostResolver = mock<PromotionReviewHostResolver>();
	const mergeRequests = mock<GitLabMergeRequestClient>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionReviewsService(
		runRepository,
		reviewRepository,
		txRunner,
		hostResolver,
		mergeRequests,
		logger,
	);

	const actor = mock<User>({
		id: 'actor',
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: 'ada@example.com',
	});
	const input = mock<PromotionOperationInput>({
		environmentId: 'env-1',
		config: {
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
		},
	});
	const host = {
		access: { baseUrl: 'https://gitlab.example.com', accessToken: 't' },
		projectPath: 'platform/api',
	};
	const push = {
		branchName: 'n8n-promotion/2026-10-05T10-00-00-000Z',
		baseBranchName: 'staging',
		commitSha: 'b'.repeat(40),
		title: 'Promote the thing',
	};
	const mergeRequest = mock<GitLabMergeRequest>({
		iid: 3,
		project_id: 7,
		web_url: 'https://gitlab.example.com/platform/api/-/merge_requests/3',
	});

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		hostResolver.resolve.mockResolvedValue(host);
		mergeRequests.createMergeRequest.mockResolvedValue(mergeRequest);
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
	});

	it('does nothing for a connection without a host API', async () => {
		hostResolver.resolve.mockResolvedValue(null);

		await expect(service.openMergeRequest(input, actor, push, 'run-1')).resolves.toEqual({
			warnings: [],
		});
		expect(mergeRequests.createMergeRequest).not.toHaveBeenCalled();
		expect(runRepository.attachReview).not.toHaveBeenCalled();
		expect(reviewRepository.insertReview).not.toHaveBeenCalled();
	});

	it('opens the merge request and records the review', async () => {
		const result = await service.openMergeRequest(input, actor, push, 'run-1');

		expect(result).toEqual({
			review: { reviewId: expect.any(String), number: 3, webUrl: mergeRequest.web_url },
			warnings: [],
		});
		const reviewId = result.review?.reviewId;
		expect(mergeRequests.createMergeRequest).toHaveBeenCalledWith(host.access, {
			projectPath: 'platform/api',
			sourceBranch: push.branchName,
			targetBranch: 'staging',
			title: 'Promote the thing',
			description: [
				'Opened by n8n for a promotion of changes by Ada Lovelace.',
				'',
				`Commit: ${push.commitSha}`,
			].join('\n'),
		});
		expect(reviewRepository.insertReview).toHaveBeenCalledWith(
			{
				id: reviewId,
				environmentId: 'env-1',
				type: 'gitlab',
				remoteReviewId: '7!3',
				createdById: 'actor',
			},
			expect.anything(),
		);
		expect(runRepository.attachReview).toHaveBeenCalledWith('run-1', reviewId, expect.anything());
	});

	it('writes the description from the commit message and the promoter', async () => {
		const unnamed = mock<User>({
			id: 'actor',
			firstName: undefined,
			lastName: undefined,
			email: 'ada@example.com',
		});

		await service.openMergeRequest(input, unnamed, { ...push, body: '/merge\nDetails' }, 'run-1');

		expect(mergeRequests.createMergeRequest.mock.calls[0][1].description).toBe(
			[
				'\\/merge',
				'Details',
				'',
				'Opened by n8n for a promotion of changes.',
				'',
				`Commit: ${push.commitSha}`,
			].join('\n'),
		);
	});

	it('returns a warning instead of throwing when the merge request cannot be opened', async () => {
		hostResolver.resolve.mockRejectedValueOnce(new Error('decrypt failed'));

		await expect(service.openMergeRequest(input, actor, push, 'run-1')).resolves.toEqual({
			warnings: [{ message: 'No merge request was opened.' }],
		});
		expect(mergeRequests.createMergeRequest).not.toHaveBeenCalled();

		mergeRequests.createMergeRequest.mockRejectedValueOnce(
			new ServiceUnavailableError('GitLab is not available. Try again later.'),
		);

		await expect(service.openMergeRequest(input, actor, push, 'run-1')).resolves.toEqual({
			warnings: [
				{
					message: 'No merge request was opened: GitLab is not available. Try again later.',
				},
			],
		});
		expect(reviewRepository.insertReview).not.toHaveBeenCalled();
	});

	it('points at the open merge request when the review row could not be written', async () => {
		reviewRepository.insertReview.mockRejectedValue(new Error('db down'));

		await expect(service.openMergeRequest(input, actor, push, 'run-1')).resolves.toEqual({
			warnings: [
				{
					message: `The merge request ${mergeRequest.web_url} was opened, but n8n could not record the review. Review it on GitLab.`,
					linkUrl: mergeRequest.web_url,
				},
			],
		});
	});
});
