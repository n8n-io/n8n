import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { Logger } from 'n8n-core';

import { mockInstance } from '@test/mocking';

import { InsightsModule } from '../insights.module';
import { InsightsService } from '../insights.service';

describe('InsightsModule', () => {
	let logger: Logger;
	let insightsService: InsightsService;
	let instanceSettings: InstanceSettings;

	beforeEach(() => {
		logger = mock<Logger>({
			scoped: jest.fn().mockReturnValue(
				mock<Logger>({
					error: jest.fn(),
				}),
			),
		});
		insightsService = mockInstance(InsightsService);
	});

	describe('backgroundProcess', () => {
		it('should start background process if instance is main and leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: true });
			const insightsModule = new InsightsModule(logger, insightsService, instanceSettings);
			insightsModule.initialize();
			expect(insightsService.startBackgroundProcess).toHaveBeenCalled();
		});

		it('should not start background process if instance is main but not leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: false });
			const insightsModule = new InsightsModule(logger, insightsService, instanceSettings);
			insightsModule.initialize();
			expect(insightsService.startBackgroundProcess).not.toHaveBeenCalled();
		});
	});
});
