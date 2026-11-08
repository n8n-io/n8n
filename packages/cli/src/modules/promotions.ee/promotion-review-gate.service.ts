import {
	promotionRunDetailsSchemas,
	type PromotionBlocker,
	type PromotionReviewState,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { PromotionReview } from './database/entities/promotion-review.entity';
import type { PromotionRun } from './database/entities/promotion-run.entity';
import { PromotionReviewRepository } from './database/repositories/promotion-review.repository';
import { PromotionRunRepository } from './database/repositories/promotion-run.repository';
import { PromotionReviewInboxService } from './promotion-review-inbox.service';

/** The live read must not stall the preview when GitLab is slow. */
export const PROMOTE_GATE_READ_TIMEOUT_MS = 3_000;

const BLOCKING_STATES: PromotionReviewState[] = ['open', 'changes_requested'];

/**
 * Whether the runs of one review cover a project. A run without `contents.projectIds` covers every
 * project of its environment, so the live read decides. This is the safe direction.
 */
export const reviewCoversProject = (runs: PromotionRun[], projectId: string) => {
	if (runs.length === 0) return true;
	const covered = new Set<string>();
	for (const run of runs) {
		const parsed = promotionRunDetailsSchemas[run.type].safeParse(run.details);
		const projectIds = parsed.success ? parsed.data.contents?.projectIds : undefined;
		if (!projectIds) return true;
		for (const id of projectIds) covered.add(id);
	}
	return covered.has(projectId);
};

/**
 * Finds the open review that already holds the promote changes of a project. The stored state
 * can be old, so each candidate gets one live read. Every failure lets the promote through:
 * a review that n8n cannot read must never block a project for good.
 */
@Service()
export class PromotionReviewGateService {
	constructor(
		private readonly inbox: PromotionReviewInboxService,
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly runRepository: PromotionRunRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	async findPromoteBlocker(
		projectId: string,
		environmentId: string,
	): Promise<PromotionBlocker | null> {
		if (!this.inbox.isEnabled()) return null;
		try {
			const open = await this.reviewRepository.findOpenByEnvironmentId(environmentId);
			if (open.length === 0) return null;
			const runs = await this.runRepository.findByReviewIds(open.map(({ id }) => id));
			const runsOf = (review: PromotionReview) => runs.filter((run) => run.reviewId === review.id);
			const covering = open.filter((review) => reviewCoversProject(runsOf(review), projectId));
			const states = await Promise.all(
				covering.map(async (review) => await this.readState(review, runsOf(review))),
			);
			const blocking = covering.find((_, index) => states[index]);
			return blocking ? { code: 'reviewOpen', reviewId: blocking.id } : null;
		} catch (error) {
			this.logger.warn('Could not check for an open promotion review', { environmentId, error });
			return null;
		}
	}

	/** True when the host reports the review as still open. */
	private async readState(review: PromotionReview, runs: PromotionRun[]): Promise<boolean> {
		try {
			const result = await this.inbox.refreshState(review, runs, {
				timeoutMs: PROMOTE_GATE_READ_TIMEOUT_MS,
			});
			if (!result.ok) {
				this.logger.warn('Could not read a promotion review from the host', {
					reviewId: review.id,
					remoteError: result.remoteError,
				});
				return false;
			}
			return BLOCKING_STATES.includes(result.state);
		} catch (error) {
			this.logger.warn('Could not read a promotion review from the host', {
				reviewId: review.id,
				error,
			});
			return false;
		}
	}
}
