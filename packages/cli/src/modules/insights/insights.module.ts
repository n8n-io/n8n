import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import './insights.controller';
import { InstanceSettings } from 'n8n-core';

import { InsightsByPeriod } from './database/entities/insights-by-period';
import { InsightsMetadata } from './database/entities/insights-metadata';
import { InsightsRaw } from './database/entities/insights-raw';

@BackendModule()
export class InsightsModule implements ModuleInterface {
	async init() {
		const { instanceType } = Container.get(InstanceSettings);

		/**
		 * Only main- and webhook-type instances collect insights because
		 * only they are informed of finished workflow executions.
		 */
		if (instanceType === 'worker') return;

		await import('./insights.controller');

		const { InsightsService } = await import('./insights.service');
		Container.get(InsightsService).startTimers();
	}

	entities() {
		return [InsightsByPeriod, InsightsMetadata, InsightsRaw];
	}
}
