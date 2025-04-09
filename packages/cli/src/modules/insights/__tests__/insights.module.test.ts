import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import type { Logger } from 'n8n-core';

import { OrchestrationService } from '@/services/orchestration.service';
import { mockInstance } from '@test/mocking';

import { InsightsModule } from '../insights.module';
import { InsightsService } from '../insights.service';

describe('InsightsModule', () => {
	let logger: Logger;
	let insightsService: InsightsService;
	let instanceSettings: InstanceSettings;
	let globalConfig: GlobalConfig;
	let hooks: ExecutionLifecycleHooks;
	let orchestrationService: OrchestrationService;

	beforeEach(() => {
		logger = mock<Logger>({
			scoped: jest.fn().mockReturnValue(
				mock<Logger>({
					error: jest.fn(),
				}),
			),
		});
		insightsService = mockInstance(InsightsService);
		hooks = mock<ExecutionLifecycleHooks>();
		globalConfig = {
			database: { type: 'postgresdb', sqlite: { poolSize: 0 } },
		} as GlobalConfig;
		orchestrationService = Container.get(OrchestrationService);
	});

	describe('backgroundProcess', () => {
		it('should start background process if instance is main and leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: true });
			new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			expect(insightsService.startBackgroundProcess).toHaveBeenCalled();
		});

		it('should not start background process if instance is main but not leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: false });
			new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			expect(insightsService.startBackgroundProcess).not.toHaveBeenCalled();
		});

		it('should not start background process if instance is worker', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'worker' });
			new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			expect(insightsService.startBackgroundProcess).not.toHaveBeenCalled();
		});

		it('should not start background process if db type is legacy sqlite', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'worker' });
			globalConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite', sqlite: { poolSize: 0 } },
			});
			new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			expect(insightsService.startBackgroundProcess).not.toHaveBeenCalled();
		});

		it('should start background process on leader takeover', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: false });
			new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			expect(insightsService.startBackgroundProcess).not.toHaveBeenCalled();
			orchestrationService.multiMainSetup.emit('leader-takeover');
			expect(insightsService.startBackgroundProcess).toHaveBeenCalled();
		});

		it('should stop background process on leader stepdown', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: true });
			new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			expect(insightsService.stopBackgroundProcess).not.toHaveBeenCalled();
			orchestrationService.multiMainSetup.emit('leader-stepdown');
			expect(insightsService.stopBackgroundProcess).toHaveBeenCalled();
		});
	});

	describe('shouldCollectInsights', () => {
		it('should return false if database type is sqlite and poolSize is not set', () => {
			globalConfig.database.type = 'sqlite';
			globalConfig.database.sqlite.poolSize = 0;

			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
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
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(hooks.addHandler).not.toHaveBeenCalled();
		});

		it('should return true if all conditions are met', () => {
			globalConfig.database.type = 'postgresdb';
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main' });

			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(hooks.addHandler).toHaveBeenCalledWith('workflowExecuteAfter', expect.any(Function));
		});
	});
});
