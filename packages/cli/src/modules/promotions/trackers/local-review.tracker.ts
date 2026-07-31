import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { WorkflowReviewEventMap } from '@/events/maps/workflow-review.event-map';

import { PromotionSignalsService } from '../promotion-signals.service';
import { PromotionRepository } from '../promotion.repository';

export const LOCAL_REVIEW_SIGNAL = 'local-review';

/**
 * Adapts the workflow-reviews module to the promotion signal contract: listens
 * for review changes on the event bus and dispatches a signal to every
 * promotion tracking that review (via `metadata.localReviewId`). All
 * review-specific knowledge lives here — the promotion core and the reviews
 * module know nothing about each other.
 */
@Service()
export class LocalReviewTracker {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly repository: PromotionRepository,
		private readonly signals: PromotionSignalsService,
	) {}

	init() {
		this.eventService.on('workflow-review-updated', (event) => {
			void this.handle(event).catch((error) =>
				this.logger.warn('Failed to dispatch workflow review signal to promotions', {
					event,
					error,
				}),
			);
		});
	}

	private async handle(event: WorkflowReviewEventMap['workflow-review-updated']) {
		// POC: scan-and-filter; a real implementation would index tracked refs
		const promotions = await this.repository.findAllNewestFirst();
		const tracking = promotions.filter(
			(promotion) => promotion.metadata.localReviewId === event.workflowReviewRequestId,
		);

		for (const promotion of tracking) {
			await this.signals.dispatch(promotion.id, {
				name: LOCAL_REVIEW_SIGNAL,
				payload: { ...event },
			});
		}
	}
}
