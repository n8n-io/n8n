import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Only main- and webhook-type instances collect insights because
 * only they are informed of finished workflow executions.
 */
@BackendModule({ name: 'insights', instanceTypes: ['main', 'webhook'] })
export class InsightsModule implements ModuleInterface {
	async init() {
		await import('./insights.controller.js');

		const { InsightsService } = await import('./insights.service.js');
		await Container.get(InsightsService).init();
	}

	async systemTasks() {
		const { InsightsCompactionTask } = await import('./insights-compaction.task.js');
		const { InsightsPruningTask } = await import('./insights-pruning.task.js');
		return [InsightsCompactionTask, InsightsPruningTask];
	}

	async entities() {
		const { InsightsByPeriod } = await import('./insights-by-period.entity.js');
		const { InsightsMetadata } = await import('./insights-metadata.entity.js');
		const { InsightsRaw } = await import('./insights-raw.entity.js');

		return [InsightsByPeriod, InsightsMetadata, InsightsRaw];
	}

	async settings() {
		const { InsightsSettings } = await import('./insights.settings.js');

		return await Container.get(InsightsSettings).settings();
	}

	@OnShutdown()
	async shutdown() {
		const { InsightsService } = await import('./insights.service.js');

		await Container.get(InsightsService).shutdown();
	}
}
