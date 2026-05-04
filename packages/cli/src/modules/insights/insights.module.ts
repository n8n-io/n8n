import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

/**
 * Only main- and webhook-type instances collect insights because
 * only they are informed of finished workflow executions.
 */
@BackendModule({ name: 'insights', instanceTypes: ['main', 'webhook'] })
export class InsightsModule implements ModuleInterface {
	async init() {
		await import('./insights.controller');

		const { InsightsService } = await import('./insights.service');
		await Container.get(InsightsService).init();
	}

	async entities() {
		const { InsightsByPeriod } = await import('./database/entities/insights-by-period');
		const { InsightsMetadata } = await import('./database/entities/insights-metadata');
		const { InsightsRaw } = await import('./database/entities/insights-raw');

		return [InsightsByPeriod, InsightsMetadata, InsightsRaw];
	}

	async settings() {
		const { InsightsSettings } = await import('./insights.settings');
		const { InsightsByPeriodRepository } = await import(
			'./database/repositories/insights-by-period.repository'
		);
		const { buildInsightsPresetAvailability } = await import('./insights-data-availability.util');

		const base = Container.get(InsightsSettings).settings();
		const instanceType = Container.get(InstanceSettings).instanceType;

		const oldestPeriodStart =
			instanceType === 'worker'
				? null
				: await Container.get(InsightsByPeriodRepository).getOldestPeriodStart();

		return {
			...base,
			insightsPresetAvailability: buildInsightsPresetAvailability(oldestPeriodStart),
		};
	}

	@OnShutdown()
	async shutdown() {
		const { InsightsService } = await import('./insights.service');

		await Container.get(InsightsService).shutdown();
	}
}
