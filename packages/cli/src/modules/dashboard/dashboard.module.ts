import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'dashboard' })
export class DashboardModule implements ModuleInterface {
	async init() {
		await import('./dashboard.controller');
		await import('./dashboard-aggregate.controller');

		const { DashboardService } = await import('./dashboard.service');
		await Container.get(DashboardService).start();

		const { DashboardAggregateService } = await import('./dashboard-aggregate.service');
		await Container.get(DashboardAggregateService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { DashboardService } = await import('./dashboard.service');
		await Container.get(DashboardService).shutdown();

		const { DashboardAggregateService } = await import('./dashboard-aggregate.service');
		await Container.get(DashboardAggregateService).shutdown();
	}

	async entities() {
		const { Dashboard } = await import('./dashboard.entity');
		const { DashboardShare } = await import('./dashboard-share.entity');
		return [Dashboard, DashboardShare];
	}
}
