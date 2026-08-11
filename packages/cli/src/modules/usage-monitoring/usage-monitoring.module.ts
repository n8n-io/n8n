import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'usage-monitoring', instanceTypes: ['main'] })
export class UsageMonitoringModule implements ModuleInterface {
	async init() {
		const { UsageMonitoringService } = await import('./usage-monitoring.service.js');
		Container.get(UsageMonitoringService).init();
	}

	@OnShutdown()
	async shutdown() {
		const { UsageMonitoringService } = await import('./usage-monitoring.service.js');
		Container.get(UsageMonitoringService).stopReporting();
	}
}
