import type { InsightsAnalystOverview } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { InsightsAnalystChatService } from '../insights-analyst-chat.service';
import type { InsightsDemoService } from '../insights-demo.service';
import type { InsightsConfig } from '../insights.config';

describe('InsightsAnalystChatService', () => {
	const overview: InsightsAnalystOverview = {
		project: { id: 'project-1', name: 'Demo Operations' },
		dateRange: {
			startDate: '2026-05-01T00:00:00.000Z',
			endDate: '2026-05-19T00:00:00.000Z',
		},
		summary: {
			total: { value: 20, deviation: 5, unit: 'count' },
			failed: { value: 3, deviation: 2, unit: 'count' },
			failureRate: { value: 0.15, deviation: 0.08, unit: 'ratio' },
			timeSaved: { value: 180, deviation: 60, unit: 'minute' },
			averageRunTime: { value: 1000, deviation: null, unit: 'millisecond' },
		},
		byTime: [],
		byWorkflow: {
			count: 2,
			data: [
				{
					workflowId: 'workflow-1',
					workflowName: 'Invoice intake triage',
					projectId: 'project-1',
					projectName: 'Demo Operations',
					total: 10,
					succeeded: 9,
					failed: 1,
					failureRate: 0.1,
					runTime: 1000,
					averageRunTime: 100,
					timeSaved: 150,
				},
				{
					workflowId: 'workflow-2',
					workflowName: 'Vendor onboarding checklist',
					projectId: 'project-1',
					projectName: 'Demo Operations',
					total: 10,
					succeeded: 7,
					failed: 3,
					failureRate: 0.3,
					runTime: 2000,
					averageRunTime: 200,
					timeSaved: 30,
				},
			],
		},
		highlights: [],
		lowImpactWorkflows: [],
		suggestedPrompts: [],
	};

	test('uses deterministic fallback when Anthropic key is empty', async () => {
		const config = mock<InsightsConfig>({
			analystAnthropicApiKey: '',
			analystModel: 'claude-sonnet-4-5-20250929',
		});
		const demoService = mock<InsightsDemoService>({
			getOverview: jest.fn().mockResolvedValue(overview),
		});
		const logger = mock<Logger>({
			scoped: jest.fn().mockReturnThis(),
		});
		const service = new InsightsAnalystChatService(config, demoService, logger);

		const response = await service.ask('Which workflows saved us the most time?');

		expect(response.mode).toBe('fallback');
		expect(response.answer).toContain('Invoice intake triage');
		expect(response.citations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					workflowId: 'workflow-1',
					metric: 'time saved',
					value: 150,
					unit: 'minute',
				}),
			]),
		);
	});
});
