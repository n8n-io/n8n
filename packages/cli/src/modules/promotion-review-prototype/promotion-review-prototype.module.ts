import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'promotion-review-prototype' })
export class PromotionReviewPrototypeModule implements ModuleInterface {
	async init() {
		await import('./promotion-review-prototype.controller');
	}
}
