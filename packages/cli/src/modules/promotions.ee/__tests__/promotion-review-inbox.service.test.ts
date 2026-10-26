import type { LicenseState, Logger } from '@n8n/backend-common';
import { ServiceUnavailableError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import type { PromotionReview } from '../database/entities/promotion-review.entity';
import type { PromotionRun } from '../database/entities/promotion-run.entity';
import type { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import type { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import type { GitLabMergeRequestClient } from '../git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest } from '../git-hosts/gitlab-merge-request.types';
import type { PromotionReviewHostResolver } from '../promotion-review-host.resolver';
import { PromotionReviewInboxService } from '../promotion-review-inbox.service';

const BRANCH = 'n8n-promotion/2026-10-05T10-00-00-000Z';

describe('PromotionReviewInboxService.refreshState', () => {
	const reviewRepository = mock<PromotionReviewRepository>();
	const runRepository = mock<PromotionRunRepository>();
	const hostResolver = mock<PromotionReviewHostResolver>();
	const mergeRequests = mock<GitLabMergeRequestClient>();

	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionReviewInboxService(
		mock<LicenseState>(),
		reviewRepository,
		runRepository,
		hostResolver,
		mergeRequests,
		logger,
		mock(),
	);

	const review = (overrides: Partial<PromotionReview> = {}) =>
		mock<PromotionReview>({
			id: 'review-1',
			type: 'gitlab',
			state: 'open',
			remoteReviewId: '7!3',
			environment: mock<PromotionEnvironment>({ id: 'env-1' }),
			...overrides,
		});
	const mergeRequest = (overrides: Partial<GitLabMergeRequest> = {}) =>
		({
			iid: 3,
			project_id: 7,
			state: 'opened',
			source_branch: BRANCH,
			detailed_merge_status: 'mergeable',
			...overrides,
		}) as GitLabMergeRequest;
	// A plain object: a mock would answer a missing optional field with a function.
	const runOf = (reviewId: string) =>
		({
			reviewId,
			type: 'git',
			details: { schemaVersion: 1, branchName: BRANCH, commitSha: 'a'.repeat(40) },
			createdAt: new Date('2026-10-05T10:00:00Z'),
		}) as PromotionRun;

	const runs = () => [runOf('review-1')];

	beforeEach(() => {
		vi.resetAllMocks();
		hostResolver.resolveForEnvironment.mockResolvedValue({
			baseUrl: 'https://gitlab.example.com',
			accessToken: 'token',
			projectPath: 'platform/api',
		} as never);
	});

	it('reads the merge request with the given timeout', async () => {
		mergeRequests.getMergeRequest.mockResolvedValue(mergeRequest());

		await expect(service.refreshState(review(), runs(), { timeoutMs: 3_000 })).resolves.toEqual({
			ok: true,
			state: 'open',
		});

		expect(mergeRequests.getMergeRequest).toHaveBeenCalledWith(
			expect.anything(),
			{ projectId: 7, iid: 3 },
			{ timeoutMs: 3_000 },
		);
		// The caller passes the runs it already loaded.
		expect(runRepository.findByReviewIds).not.toHaveBeenCalled();
	});

	it.each(['merged', 'closed'] as const)(
		'records a %s review the way the Inbox sync does',
		async (state) => {
			const stored = review();
			reviewRepository.recordHostState.mockResolvedValue(true);
			mergeRequests.getMergeRequest.mockResolvedValue(mergeRequest({ state }));

			await service.refreshState(stored, runs(), { timeoutMs: 3_000 });

			expect(reviewRepository.recordHostState).toHaveBeenCalledWith(
				'review-1',
				state,
				expect.any(Date),
			);
			expect(stored.state).toBe(state);
		},
	);

	it('records nothing when the read fails', async () => {
		mergeRequests.getMergeRequest.mockRejectedValue(new ServiceUnavailableError('slow'));

		await service.refreshState(review(), runs(), { timeoutMs: 3_000 });

		expect(reviewRepository.recordHostState).not.toHaveBeenCalled();
	});

	it('still returns the host state when the write fails', async () => {
		reviewRepository.recordHostState.mockRejectedValue(new Error('db down'));
		mergeRequests.getMergeRequest.mockResolvedValue(mergeRequest());
		reviewRepository.recordHostState.mockClear();

		await expect(service.refreshState(review(), runs(), { timeoutMs: 3_000 })).resolves.toEqual({
			ok: true,
			state: 'open',
		});

		mergeRequests.getMergeRequest.mockResolvedValue(mergeRequest({ state: 'merged' }));
		await expect(service.refreshState(review(), runs(), { timeoutMs: 3_000 })).resolves.toEqual({
			ok: true,
			state: 'merged',
		});
	});

	it('rejects a merge request on a branch that n8n did not push', async () => {
		mergeRequests.getMergeRequest.mockResolvedValue(mergeRequest({ source_branch: 'other' }));

		await expect(service.refreshState(review(), runs(), { timeoutMs: 3_000 })).resolves.toEqual({
			ok: false,
			remoteError: 'not_found',
		});
	});

	it('shares one host call between callers that ask at the same time', async () => {
		let release: (value: GitLabMergeRequest) => void = () => {};
		mergeRequests.getMergeRequest.mockReturnValueOnce(
			new Promise<GitLabMergeRequest>((resolve) => {
				release = resolve;
			}),
		);

		const first = service.refreshState(review(), runs(), { timeoutMs: 3_000 });
		const second = service.refreshState(review(), runs(), { timeoutMs: 3_000 });
		await vi.waitFor(() => expect(mergeRequests.getMergeRequest).toHaveBeenCalledTimes(1));
		release(mergeRequest());

		await expect(first).resolves.toEqual({ ok: true, state: 'open' });
		await expect(second).resolves.toEqual({ ok: true, state: 'open' });
		expect(mergeRequests.getMergeRequest).toHaveBeenCalledTimes(1);

		mergeRequests.getMergeRequest.mockResolvedValueOnce(mergeRequest());
		await service.refreshState(review(), runs(), { timeoutMs: 3_000 });
		expect(mergeRequests.getMergeRequest).toHaveBeenCalledTimes(2);
	});
});
