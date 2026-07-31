import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'promotions' })
export class PromotionsModule implements ModuleInterface {
	async init() {
		const { PromotionModelRegistry } = await import('./promotion-model-registry.js');
		const { DirectPushModel } = await import('./models/direct-push.model.js');
		const { ApiCollabModel } = await import('./models/api-collab.model.js');
		const { GitReviewModel } = await import('./models/git-review.model.js');

		const registry = Container.get(PromotionModelRegistry);
		registry.register(Container.get(DirectPushModel));
		registry.register(Container.get(ApiCollabModel));
		registry.register(Container.get(GitReviewModel));
	}

	async entities() {
		const { Promotion } = await import('./promotion.entity.js');
		return [Promotion];
	}
}
