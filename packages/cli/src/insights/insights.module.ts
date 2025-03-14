import type { ExecutionLifecycleHooks } from 'n8n-core';
import { Logger } from 'n8n-core';

import type { BaseN8nModule } from '@/decorators/module';
import { N8nModule } from '@/decorators/module';

import { InsightsService } from './insights.service';

import './controller';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	constructor(
		private readonly logger: Logger,
		private readonly insightsService: InsightsService,
	) {
		this.logger = this.logger.scoped('insights');
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const insightsService = this.insightsService;

		hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
			await insightsService.workflowExecuteAfterHandler(this, fullRunData);
		});
	}
}
