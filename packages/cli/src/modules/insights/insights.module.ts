import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule, OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';

import { InsightsService } from './insights.service';

import './insights.controller';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	constructor(
		private readonly logger: Logger,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('insights');
	}

	initialize() {
		// We want to initialize the insights background process (schedulers) for the main leader instance
		// to have only one main instance saving the insights data
		if (this.instanceSettings.isLeader) {
			this.insightsService.startBackgroundProcess();
		}
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const insightsService = this.insightsService;

		hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
			await insightsService.workflowExecuteAfterHandler(this, fullRunData);
		});
	}

	@OnLeaderTakeover()
	startBackgroundProcess() {
		this.insightsService.startBackgroundProcess();
	}

	@OnLeaderStepdown()
	stopBackgroundProcess() {
		this.insightsService.stopBackgroundProcess();
	}
}
