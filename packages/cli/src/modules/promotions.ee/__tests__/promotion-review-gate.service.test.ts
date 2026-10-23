import type { PromotionReviewState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { PromotionReview } from '../database/entities/promotion-review.entity';
import type { PromotionRun } from '../database/entities/promotion-run.entity';
import type { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import type { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import {
	PROMOTE_GATE_READ_TIMEOUT_MS,
	PromotionReviewGateService,
	reviewCoversProject,
} from '../promotion-review-gate.service';
import type {
	LiveReviewState,
	PromotionReviewInboxService,
} from '../promotion-review-inbox.service';

// A plain object: a mock would answer a missing optional field with a function.
const run = (reviewId: string, projectIds?: string[], details: unknown = undefined) =>
	({
		reviewId,
		type: 'git',
		details: details ?? {
			schemaVersion: 1,
			branchName: `branch-${reviewId}`,
			commitSha: 'a'.repeat(40),
			...(projectIds && { contents: { projectIds } }),
		},
	}) as PromotionRun;

const live = (state: PromotionReviewState): LiveReviewState => ({ ok: true, state });

describe('reviewCoversProject', () => {
	it('covers every project when a run lists none', () => {
		expect(reviewCoversProject([run('r1')], 'p1')).toBe(true);
		expect(reviewCoversProject([], 'p1')).toBe(true);
	});

	it('covers a project that a run lists, and no other', () => {
		expect(reviewCoversProject([run('r1', ['p1'])], 'p1')).toBe(true);
		expect(reviewCoversProject([run('r1', ['p1'])], 'p2')).toBe(false);
	});

	it('joins the projects of several runs, and one legacy run covers all', () => {
		expect(reviewCoversProject([run('r1', ['p1']), run('r1', ['p2'])], 'p2')).toBe(true);
		expect(reviewCoversProject([run('r1', ['p1']), run('r1')], 'p9')).toBe(true);
	});
});

describe('PromotionReviewGateService', () => {
	const inbox = mock<PromotionReviewInboxService>();
	const reviewRepository = mock<PromotionReviewRepository>();
	const runRepository = mock<PromotionRunRepository>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionReviewGateService(inbox, reviewRepository, runRepository, logger);

	const review = (id: string) => mock<PromotionReview>({ id });

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		inbox.isEnabled.mockReturnValue(true);
	});

	it('does not read the host when the environment has no open review', async () => {
		reviewRepository.findOpenByEnvironmentId.mockResolvedValue([]);

		await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toBeNull();

		expect(inbox.refreshState).not.toHaveBeenCalled();
		expect(runRepository.findByReviewIds).not.toHaveBeenCalled();
	});

	it('does nothing when promotion reviews are off', async () => {
		inbox.isEnabled.mockReturnValue(false);

		await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toBeNull();

		expect(reviewRepository.findOpenByEnvironmentId).not.toHaveBeenCalled();
	});

	it.each<PromotionReviewState>(['open', 'changes_requested'])(
		'blocks a covered project while the host says %s',
		async (state) => {
			reviewRepository.findOpenByEnvironmentId.mockResolvedValue([review('r1')]);
			runRepository.findByReviewIds.mockResolvedValue([run('r1', ['p1'])]);
			inbox.refreshState.mockResolvedValue(live(state));

			await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toEqual({
				code: 'reviewOpen',
				reviewId: 'r1',
			});
			expect(inbox.refreshState).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'r1' }),
				[expect.objectContaining({ reviewId: 'r1' })],
				{ timeoutMs: PROMOTE_GATE_READ_TIMEOUT_MS },
			);
		},
	);

	it.each<PromotionReviewState>(['merged', 'closed'])(
		'lets the promote through when the host says %s',
		async (state) => {
			reviewRepository.findOpenByEnvironmentId.mockResolvedValue([review('r1')]);
			runRepository.findByReviewIds.mockResolvedValue([run('r1', ['p1'])]);
			inbox.refreshState.mockResolvedValue(live(state));

			await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toBeNull();
		},
	);

	it('does not read a review that covers another project', async () => {
		reviewRepository.findOpenByEnvironmentId.mockResolvedValue([review('r1')]);
		runRepository.findByReviewIds.mockResolvedValue([run('r1', ['p2'])]);

		await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toBeNull();

		expect(inbox.refreshState).not.toHaveBeenCalled();
	});

	it.each(['unreachable'] as const)(
		'lets the promote through and logs when the host read fails with %s',
		async (remoteError) => {
			reviewRepository.findOpenByEnvironmentId.mockResolvedValue([review('r1')]);
			runRepository.findByReviewIds.mockResolvedValue([run('r1', ['p1'])]);
			inbox.refreshState.mockResolvedValue({ ok: false, remoteError });

			await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toBeNull();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ reviewId: 'r1', remoteError }),
			);
		},
	);

	it('keeps a blocker from one review when the read of another fails', async () => {
		reviewRepository.findOpenByEnvironmentId.mockResolvedValue([review('r1'), review('r2')]);
		runRepository.findByReviewIds.mockResolvedValue([run('r1', ['p1']), run('r2', ['p1'])]);
		inbox.refreshState.mockImplementation(async ({ id }) =>
			id === 'r1' ? { ok: false, remoteError: 'unreachable' } : live('open'),
		);

		await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toEqual({
			code: 'reviewOpen',
			reviewId: 'r2',
		});
	});

	it.each(['review lookup', 'run lookup'])(
		'lets the promote through when the %s fails',
		async (failing) => {
			if (failing === 'review lookup') {
				reviewRepository.findOpenByEnvironmentId.mockRejectedValue(new Error('db down'));
			} else {
				reviewRepository.findOpenByEnvironmentId.mockResolvedValue([review('r1')]);
				runRepository.findByReviewIds.mockRejectedValue(new Error('db down'));
			}

			await expect(service.findPromoteBlocker('p1', 'env-1')).resolves.toBeNull();

			expect(logger.warn).toHaveBeenCalled();
			expect(inbox.refreshState).not.toHaveBeenCalled();
		},
	);
});
