import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings, Logger } from 'n8n-core';

import { InsightsByPeriod } from './database/entities/insights-by-period';
import { InsightsMetadata } from './database/entities/insights-metadata';
import { InsightsRaw } from './database/entities/insights-raw';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('insights');
	}

	async initialize() {
		await import('./insights.controller');
		const { InsightsService } = await import('./insights.service');
		const insightsService = Container.get(InsightsService);
		// We want to initialize the insights background process (schedulers) for the main leader instance
		// to have only one main instance saving the insights data
		if (this.instanceSettings.isLeader) {
			insightsService.startTimers();
		}
	}

	entities() {
		return [InsightsByPeriod, InsightsMetadata, InsightsRaw];
	}
}
