import { GlobalConfig } from '@n8n/config';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';

import type { BaseN8nModule } from '@/decorators/module';
import { N8nModule } from '@/decorators/module';
import { OrchestrationService } from '@/services/orchestration.service';

import { InsightsService } from './insights.service';
import './insights.controller';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	constructor(
		private readonly logger: Logger,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly orchestrationService: OrchestrationService,
	) {
		this.logger = this.logger.scoped('insights');

		// Initialize background process for insights if instance is main and leader
		if (this.instanceSettings.instanceType === 'main' && this.instanceSettings.isLeader) {
			this.insightsService.startBackgroundProcess();
		}

		if (this.instanceSettings.isMultiMain) {
			this.orchestrationService.multiMainSetup.on('leader-takeover', () =>
				this.insightsService.startBackgroundProcess(),
			);
			this.orchestrationService.multiMainSetup.on('leader-stepdown', () =>
				this.insightsService.stopBackgroundProcess(),
			);
		}
	}

	private shouldRegisterLifecycleHooks(): boolean {
		// Disable insights for workers
		if (this.instanceSettings.instanceType === 'worker') {
			return false;
		}

		// Disable insights for sqlite if pool size is not set
		// This is because legacy sqlite does not support nested transactions needed for insights
		if (
			this.globalConfig.database.type === 'sqlite' &&
			!this.globalConfig.database.sqlite.poolSize
		) {
			return false;
		}

		return true;
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const insightsService = this.insightsService;

		// Workers should not be saving any insights
		if (this.shouldRegisterLifecycleHooks()) {
			hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
				await insightsService.workflowExecuteAfterHandler(this, fullRunData);
			});
		}
	}
}
