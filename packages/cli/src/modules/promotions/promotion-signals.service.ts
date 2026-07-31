import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { PromotionSignal } from './promotion-model';
import { PromotionModelRegistry } from './promotion-model-registry';
import { PromotionRepository } from './promotion.repository';

/**
 * Generic entry point for tracked signals: records the observed value on the
 * promotion, then hands over to the owning model to re-evaluate its state.
 * Trackers are the only callers, so the promotion core stays decoupled from
 * whatever is being tracked and how (event listener, poller, manual sync).
 */
@Service()
export class PromotionSignalsService {
	constructor(
		private readonly logger: Logger,
		private readonly registry: PromotionModelRegistry,
		private readonly repository: PromotionRepository,
	) {}

	async dispatch(promotionId: string, signal: PromotionSignal): Promise<void> {
		const promotion = await this.repository.findById(promotionId);
		if (!promotion) return;

		const signals = promotion.metadata.signals as Record<string, unknown> | undefined;
		promotion.metadata = {
			...promotion.metadata,
			signals: { ...signals, [signal.name]: signal.payload },
		};
		const saved = await this.repository.save(promotion);

		const model = this.registry.get(saved.model);
		if (!model.onSignal) return;

		const result = await model.onSignal(saved, signal);
		this.logger.debug(
			`Promotion "${promotionId}" handled signal "${signal.name}" (state: ${result.state})`,
		);
	}
}
