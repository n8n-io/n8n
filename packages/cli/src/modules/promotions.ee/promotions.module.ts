import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'promotions',
	// The entitlement is unchanged; only the module name moved.
	licenseFlag: LICENSE_FEATURES.GIT_CONNECTIONS,
	instanceTypes: ['main'],
})
export class PromotionsModule implements ModuleInterface {
	async init() {
		await import('./promotion-changes.controller.js');

		const { PromotionsService } = await import('./promotions.service.js');
		Container.get(PromotionsService);
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
