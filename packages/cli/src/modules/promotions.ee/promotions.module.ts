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
		const { PromotionsService } = await import('./promotions.service.js');
		Container.get(PromotionsService);
	}

	async entities() {
		const { PromotionProvider } = await import('./database/entities/promotion-provider.entity.js');
		const { PromotionConnection } = await import(
			'./database/entities/promotion-connection.entity.js'
		);
		const { PromotionConnectionProject } = await import(
			'./database/entities/promotion-connection-project.entity.js'
		);
		const { PromotionConfig } = await import('./database/entities/promotion-config.entity.js');
		return [PromotionProvider, PromotionConnection, PromotionConnectionProject, PromotionConfig];
	}
}
