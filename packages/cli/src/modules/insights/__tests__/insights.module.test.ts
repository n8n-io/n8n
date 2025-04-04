import type { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { InstanceSettings } from 'n8n-core';
import { Logger } from 'n8n-core';

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
		logger = mockInstance(Logger);
		insightsService = mockInstance(InsightsService);
		hooks = mock<ExecutionLifecycleHooks>();
		globalConfig = {
			database: { type: 'postgresdb', sqlite: { poolSize: 0 } },
		} as GlobalConfig;
		orchestrationService = Container.get(OrchestrationService);
	});

	describe('compactionScheduler', () => {
		it('should start compaction scheduler if instance is main and leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: true });
			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(insightsService.startCompactionScheduler).toHaveBeenCalled();
		});

		it('should not start compaction scheduler if instance is main but not leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: false });
			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(insightsService.startCompactionScheduler).not.toHaveBeenCalled();
		});

		it('should not start compaction scheduler if instance is worker', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'worker' });
			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(insightsService.startCompactionScheduler).not.toHaveBeenCalled();
		});

		it('should start compaction scheduler on leader takeover', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: false });
			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(insightsService.startCompactionScheduler).not.toHaveBeenCalled();
			orchestrationService.multiMainSetup.emit('leader-takeover');
			expect(insightsService.startCompactionScheduler).toHaveBeenCalled();
		});

		it('should stop compaction scheduler on leader stepdown', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: true });
			const module = new InsightsModule(
				logger,
				insightsService,
				instanceSettings,
				globalConfig,
				orchestrationService,
			);
			module.registerLifecycleHooks(hooks);
			expect(insightsService.stopCompactionScheduler).not.toHaveBeenCalled();
			orchestrationService.multiMainSetup.emit('leader-stepdown');
			expect(insightsService.stopCompactionScheduler).toHaveBeenCalled();
		});
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
