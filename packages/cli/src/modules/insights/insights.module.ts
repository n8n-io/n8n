import { GlobalConfig } from '@n8n/config';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings, Logger } from 'n8n-core';

import type { BaseN8nModule } from '@/decorators/module';
import { N8nModule } from '@/decorators/module';

import { InsightsService } from './insights.service';
import './insights.controller';
import { ModulesConfig } from '../modules.config';

@N8nModule()
export class InsightsModule implements BaseN8nModule {
	constructor(
		private readonly logger: Logger,
		private readonly insightsService: InsightsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly moduleConfig: ModulesConfig,
	) {
		this.logger = this.logger.scoped('insights');
	}

	private shouldRegisterLifecycleHooks(): boolean {
		if (
			this.globalConfig.database.type === 'sqlite' &&
			!this.globalConfig.database.sqlite.poolSize
		) {
			return false;
		}

		if (this.instanceSettings.instanceType === 'worker') {
			return false;
		}

		if (
			this.globalConfig.database.type === 'postgresdb' &&
			!this.moduleConfig.enabledModules.includes('insights')
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
