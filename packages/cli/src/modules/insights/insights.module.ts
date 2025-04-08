import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';

import type { BaseN8nModule } from '@/decorators/module';
import { N8nModule } from '@/decorators/module';

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

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const insightsService = this.insightsService;

		// Workers should not be saving any insights
		if (this.instanceSettings.instanceType !== 'worker') {
			hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
				await insightsService.workflowExecuteAfterHandler(this, fullRunData);
			});
		}
	}
}
