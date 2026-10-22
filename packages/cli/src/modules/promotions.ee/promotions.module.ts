import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'promotions',
	licenseFlag: LICENSE_FEATURES.PROMOTIONS,
	instanceTypes: ['main'],
})
export class PromotionsModule implements ModuleInterface {
	async init() {
		await import('./promotion-changes.controller.js');
		await import('./promotion-reviews.controller.js');

		const { PromotionsService } = await import('./promotions.service.js');
		Container.get(PromotionsService);

		const { InboxSourceRegistry } = await import('../inbox/inbox-source.registry.js');
		const { PromotionReviewInboxService } = await import('./promotion-review-inbox.service.js');
		const reviews = Container.get(PromotionReviewInboxService);
		Container.get(InboxSourceRegistry).register({
			type: 'promotion_review',
			isEnabled: async () => reviews.isEnabled(),
			list: async (user, query) => await reviews.listForInbox(user, query),
			count: async (user) => await reviews.countForInbox(user),
		});
	}

	async entities() {
		const { PromotionProvider } = await import('./database/entities/promotion-provider.entity.js');
		const { PromotionEnvironment } = await import(
			'./database/entities/promotion-environment.entity.js'
		);
		const { PromotionEnvironmentProject } = await import(
			'./database/entities/promotion-environment-project.entity.js'
		);
		const { PromotionRun } = await import('./database/entities/promotion-run.entity.js');
		const { PromotionReview } = await import('./database/entities/promotion-review.entity.js');
		return [
			PromotionProvider,
			PromotionEnvironment,
			PromotionEnvironmentProject,
			PromotionRun,
			PromotionReview,
		];
	}
}
