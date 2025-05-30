import { InstanceSettings } from 'n8n-core';

import { mockInstance } from '@test/mocking';

import { InsightsInit } from '../insights.init';
import { InsightsService } from '../insights.service';

describe('InsightsModule', () => {
	let insightsService: InsightsService;
	let instanceSettings: InstanceSettings;

	beforeEach(() => {
		insightsService = mockInstance(InsightsService);
	});

	describe('backgroundProcess', () => {
		it('should start background process if instance is main and leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: true });
			new InsightsInit(insightsService, instanceSettings);
			expect(insightsService.startTimers).toHaveBeenCalled();
		});

		it('should not start background process if instance is main but not leader', () => {
			instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main', isLeader: false });
			new InsightsInit(insightsService, instanceSettings);
			expect(insightsService.startTimers).not.toHaveBeenCalled();
		});
	});
});
