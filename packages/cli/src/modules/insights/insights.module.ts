import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import './insights.controller';
import { InstanceSettings } from 'n8n-core';

import { InsightsByPeriod } from './database/entities/insights-by-period';
import { InsightsMetadata } from './database/entities/insights-metadata';
import { InsightsRaw } from './database/entities/insights-raw';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	async init() {
		const { instanceType } = Container.get(InstanceSettings);

		/**
		 * Only main- and webhook-type instances collect insights because
		 * only they are informed of finished workflow executions.
		 */
		if (instanceType === 'main' || instanceType === 'webhook') {
			const { InsightsInit } = await import('./insights.init');
			Container.get(InsightsInit);
		}
	}

	entities() {
		return [InsightsByPeriod, InsightsMetadata, InsightsRaw];
	}
}
