import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'automation-maps', instanceTypes: ['main'] })
export class AutomationMapsModule implements ModuleInterface {
	async init() {
		await import('./automation-maps.controller.js');

		const { AutomationMapsService } = await import('./automation-maps.service.js');
		Container.get(AutomationMapsService).startAutoUpdates();
	}

	@OnShutdown()
	async shutdown() {
		const { AutomationMapsService } = await import('./automation-maps.service.js');
		Container.get(AutomationMapsService).stopAutoUpdates();
	}

	async entities() {
		const { AutomationMap } = await import('./automation-map.entity.js');
		return [AutomationMap] as never;
	}
}
