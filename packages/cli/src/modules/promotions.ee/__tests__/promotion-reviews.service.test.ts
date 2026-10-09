import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ServiceUnavailableError } from '@n8n/errors';

import type { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import type {
	GitLabMergeRequest,
	GitLabMergeRequestClient,
} from '../git-hosts/gitlab-merge-request.client';
import type { PromotionReviewHostResolver } from '../promotion-review-host.resolver';
import { PromotionReviewsService } from '../promotion-reviews.service';
import type { PromotionOperationInput } from '../promotions.types';

describe('PromotionReviewsService', () => {
	const reviewRepository = mock<PromotionReviewRepository>();
	const hostResolver = mock<PromotionReviewHostResolver>();
	const mergeRequests = mock<GitLabMergeRequestClient>();
	const urlService = mock<UrlService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionReviewsService(
		reviewRepository,
		hostResolver,
		mergeRequests,
		urlService,
		logger,
	);

	const actor = mock<User>({
		id: 'actor',
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: 'ada@example.com',
	});
	const input = mock<PromotionOperationInput>({
		connectionId: 'conn1',
		config: {
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: true },
		},
	});
	const host = {
		access: { baseUrl: 'https://gitlab.example.com', username: 'n8n', accessToken: 't' },
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
		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		hostResolver.resolve.mockResolvedValue(host);
		mergeRequests.createMergeRequest.mockResolvedValue(mergeRequest);
	});

	it('does nothing for a connection without a host API', async () => {
		hostResolver.resolve.mockResolvedValue(null);

		await expect(service.openMergeRequest(input, actor, push)).resolves.toEqual({
			warnings: [],
		});
		expect(mergeRequests.createMergeRequest).not.toHaveBeenCalled();
		expect(reviewRepository.insertReview).not.toHaveBeenCalled();
	});

	it('opens the merge request with the review link and records the review', async () => {
		const result = await service.openMergeRequest(input, actor, push);

		expect(result).toEqual({
			mergeRequest: { reviewId: expect.any(String), iid: 3, webUrl: mergeRequest.web_url },
			warnings: [],
		});
		const reviewId = result.mergeRequest?.reviewId;
		expect(mergeRequests.createMergeRequest).toHaveBeenCalledWith(host.access, {
			projectPath: 'platform/api',
			sourceBranch: push.branchName,
			targetBranch: 'staging',
			title: 'Promote the thing',
			description: expect.stringContaining(
				`Review in n8n: https://n8n.example.com/reviews/promotion:${reviewId}`,
			),
		});
		expect(mergeRequests.createMergeRequest.mock.calls[0][1].description).toContain(
			'promotion by Ada Lovelace',
		);
		expect(reviewRepository.insertReview).toHaveBeenCalledWith({
			id: reviewId,
			connectionId: 'conn1',
			createdById: 'actor',
			branchName: push.branchName,
			commitSha: push.commitSha,
			remoteReviewId: 'gitlab:7!3',
		});
	});

	it('returns a warning instead of throwing when the host cannot be resolved', async () => {
		hostResolver.resolve.mockRejectedValue(new Error('decrypt failed'));

		await expect(service.openMergeRequest(input, actor, push)).resolves.toEqual({
			warnings: [
				`The branch ${push.branchName} was pushed, but no merge request was opened: decrypt failed`,
			],
		});
		expect(mergeRequests.createMergeRequest).not.toHaveBeenCalled();
	});

	it('returns a warning instead of throwing when GitLab refuses the merge request', async () => {
		mergeRequests.createMergeRequest.mockRejectedValue(
			new ServiceUnavailableError('GitLab is not available. Try again later.'),
		);

		await expect(service.openMergeRequest(input, actor, push)).resolves.toEqual({
			warnings: [
				`The branch ${push.branchName} was pushed, but no merge request was opened: GitLab is not available. Try again later.`,
			],
		});
		expect(reviewRepository.insertReview).not.toHaveBeenCalled();
	});

	it('points at the open merge request when the review row could not be written', async () => {
		reviewRepository.insertReview.mockRejectedValue(new Error('db down'));

		await expect(service.openMergeRequest(input, actor, push)).resolves.toEqual({
			warnings: [
				`The merge request ${mergeRequest.web_url} was opened, but n8n could not record the review. Review it on GitLab.`,
			],
		});
	});
});
