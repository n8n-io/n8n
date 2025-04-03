import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings } from 'n8n-core';
import { Logger } from 'n8n-core';

import { mockInstance } from '@test/mocking';

import type { ModulesConfig } from '../../modules.config';
import { InsightsModule } from '../insights.module';
import { InsightsService } from '../insights.service';

describe('InsightsModule', () => {
	let logger: Logger;
	let insightsService: InsightsService;
	let instanceSettings: InstanceSettings;
	let globalConfig: GlobalConfig;
	let moduleConfig: ModulesConfig;
	let hooks: ExecutionLifecycleHooks;

	beforeEach(() => {
		logger = mockInstance(Logger);
		insightsService = mockInstance(InsightsService);
		hooks = mock<ExecutionLifecycleHooks>();
		globalConfig = {
			database: { type: 'postgresdb', sqlite: { poolSize: 0 } },
		} as GlobalConfig;
		moduleConfig = { enabledModules: ['insights'] } as ModulesConfig;
	});

	describe('shouldRegisterLifecycleHooks', () => {
		it('should return false if database type is sqlite and poolSize is not set', () => {
			globalConfig.database.type = 'sqlite';
			globalConfig.database.sqlite.poolSize = 0;

			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				moduleConfig,
			);
			module.registerLifecycleHooks(hooks);
			expect(hooks.addHandler).not.toHaveBeenCalled();
		});

		it('should return false if instance type is worker', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'worker' });

			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				moduleConfig,
			);
			module.registerLifecycleHooks(hooks);
			expect(hooks.addHandler).not.toHaveBeenCalled();
		});

		it('should return false if database type is postgresdb and insights module is not enabled', () => {
			globalConfig.database.type = 'postgresdb';
			moduleConfig.enabledModules = [];

			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				moduleConfig,
			);
			module.registerLifecycleHooks(hooks);
			expect(hooks.addHandler).not.toHaveBeenCalled();
		});

		it('should return true if all conditions are met', () => {
			globalConfig.database.type = 'postgresdb';
			moduleConfig.enabledModules = ['insights'];
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main' });

			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				moduleConfig,
			);
			module.registerLifecycleHooks(hooks);
			expect(hooks.addHandler).toHaveBeenCalledWith('workflowExecuteAfter', expect.any(Function));
		});
	});
});
