import type { ModuleInterface } from '@n8n/decorators';
import { Module, OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { InstanceSettings, Logger } from 'n8n-core';

import { InsightsService } from './insights.service';

import './insights.controller';

@Module('insights')
export class InsightsModule implements ModuleInterface {
	constructor(
		private readonly logger: Logger,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('insights');
	}

	activate() {
		/**
		 * Only the leader is entitled to collect, compact and prune insights
		 * so that only a single main operates on the DB.
		 */
		if (this.instanceSettings.isLeader) this.insightsService.startTimers();
	}

	@OnLeaderTakeover()
	startBackgroundProcess() {
		this.insightsService.startTimers();
	}

	@OnLeaderStepdown()
	stopBackgroundProcess() {
		this.insightsService.stopTimers();
	}
}
