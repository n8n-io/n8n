import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';

import type { BaseN8nModule } from '@/decorators/module';
import { N8nModule } from '@/decorators/module';
import type { MultiMainSetup } from '@/scaling/multi-main-setup.ee';

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

	registerMultiMainListeners(multiMainSetup: MultiMainSetup) {
		multiMainSetup.on('leader-takeover', () => this.insightsService.startBackgroundProcess());
		multiMainSetup.on('leader-stepdown', () => this.insightsService.stopBackgroundProcess());
	}
}
