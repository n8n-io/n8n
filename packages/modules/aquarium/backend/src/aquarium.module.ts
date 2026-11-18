import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Live run counts for the aquarium view. Only main instances run the start and end hooks
 * of every run. On by default: turn it off with `N8N_DISABLED_MODULES=aquarium`.
 */
@BackendModule({ name: 'aquarium', instanceTypes: ['main'] })
export class AquariumModule implements ModuleInterface {
	async init() {
		await import('./aquarium.controller.js');

		const { AquariumActivityService } = await import('./aquarium-activity.service.js');
		Container.get(AquariumActivityService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { AquariumActivityService } = await import('./aquarium-activity.service.js');
		Container.get(AquariumActivityService).shutdown();
	}
}
