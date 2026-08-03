import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { Push } from '@/push';

import type { SubmitPromotionRequest } from './promotion-model';
import { PromotionModelRegistry } from './promotion-model-registry';
import type { Promotion } from './promotion.entity';
import { PromotionRepository } from './promotion.repository';

@Service()
export class PromotionsService {
	constructor(
		private readonly registry: PromotionModelRegistry,
		private readonly repository: PromotionRepository,
		private readonly push: Push,
	) {}

	async submit(request: SubmitPromotionRequest, user: User) {
		const promotion = await this.registry.get(request.model).submit(request, { user });
		this.broadcastUpdated(promotion.id);
		return this.describe(promotion);
	}

	async list() {
		const promotions = await this.repository.findAllNewestFirst();
		return promotions.map((promotion) => this.describe(promotion));
	}

	async get(id: string) {
		return this.describe(await this.getEntity(id));
	}

	async executeAction(
		id: string,
		action: string,
		payload: Record<string, unknown> | undefined,
		user: User,
	) {
		const promotion = await this.getEntity(id);
		const model = this.registry.get(promotion.model);

		const available = model.availableActions(promotion);
		if (!available.includes(action)) {
			throw new UserError(
				`Action "${action}" is not available for promotion "${id}" in state "${promotion.state}". Available: ${available.join(', ') || 'none'}`,
			);
		}

		const executed = await model.execute(action, promotion, payload, { user });
		this.broadcastUpdated(executed.id);
		return this.describe(executed);
	}

	async sync(id: string, user: User) {
		const promotion = await this.getEntity(id);
		const model = this.registry.get(promotion.model);

		// Models without external state are always in sync
		const synced = model.sync ? await model.sync(promotion, { user }) : promotion;
		this.broadcastUpdated(synced.id);
		return this.describe(synced);
	}

	/**
	 * Invalidation-only push so open UIs refetch. Promotion state also moves
	 * without user action (signal dispatch, PR poller) — those paths emit via
	 * `PromotionSignalsService`.
	 */
	private broadcastUpdated(promotionId: string) {
		this.push.broadcast({ type: 'promotionsUpdated', data: { promotionId } });
	}

	private async getEntity(id: string) {
		const promotion = await this.repository.findById(id);
		if (!promotion) throw new UserError(`Promotion "${id}" not found`);
		return promotion;
	}

	private describe(promotion: Promotion) {
		return {
			...promotion,
			availableActions: this.registry.get(promotion.model).availableActions(promotion),
		};
	}
}
