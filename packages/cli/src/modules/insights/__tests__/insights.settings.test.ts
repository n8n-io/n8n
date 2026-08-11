import type { LicenseState } from '@n8n/backend-common';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsSettings } from '../insights.settings';

describe('InsightsSettings', () => {
	let licenseMock: Mocked<LicenseState>;
	let repositoryMock: Mocked<InsightsByPeriodRepository>;
	let insightsSettings: InsightsSettings;

	beforeAll(() => {
		licenseMock = mock<LicenseState>();
		repositoryMock = mock<InsightsByPeriodRepository>();
		repositoryMock.getEarliestDataDate.mockResolvedValue(null);
		insightsSettings = new InsightsSettings(licenseMock, repositoryMock);
	});

	test('returns correct summary and dashboard licenses', async () => {
		licenseMock.isInsightsSummaryLicensed.mockReturnValue(true);
		licenseMock.isInsightsDashboardLicensed.mockReturnValue(true);

		const result = await insightsSettings.settings();

		expect(result.summary).toBe(true);
		expect(result.dashboard).toBe(true);
	});

	describe('dateRanges', () => {
		test('returns correct ranges when hourly data is enabled and max history is unlimited', async () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(-1);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);

			const result = await insightsSettings.settings();

			expect(result.dateRanges).toEqual([
				{ key: 'day', licensed: true, granularity: 'hour' },
				{ key: 'week', licensed: true, granularity: 'day' },
				{ key: '2weeks', licensed: true, granularity: 'day' },
				{ key: 'month', licensed: true, granularity: 'day' },
				{ key: 'quarter', licensed: true, granularity: 'week' },
				{ key: '6months', licensed: true, granularity: 'week' },
				{ key: 'year', licensed: true, granularity: 'week' },
			]);
		});

		test('returns correct ranges when hourly data is enabled and max history is 365 days', async () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(365);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);

			const result = await insightsSettings.settings();

			expect(result.dateRanges).toEqual([
				{ key: 'day', licensed: true, granularity: 'hour' },
				{ key: 'week', licensed: true, granularity: 'day' },
				{ key: '2weeks', licensed: true, granularity: 'day' },
				{ key: 'month', licensed: true, granularity: 'day' },
				{ key: 'quarter', licensed: true, granularity: 'week' },
				{ key: '6months', licensed: true, granularity: 'week' },
				{ key: 'year', licensed: true, granularity: 'week' },
			]);
		});

		test('returns correct ranges when hourly data is disabled and max history is 30 days', async () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(30);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);

			const result = await insightsSettings.settings();

			expect(result.dateRanges).toEqual([
				{ key: 'day', licensed: false, granularity: 'hour' },
				{ key: 'week', licensed: true, granularity: 'day' },
				{ key: '2weeks', licensed: true, granularity: 'day' },
				{ key: 'month', licensed: true, granularity: 'day' },
				{ key: 'quarter', licensed: false, granularity: 'week' },
				{ key: '6months', licensed: false, granularity: 'week' },
				{ key: 'year', licensed: false, granularity: 'week' },
			]);
		});

		test('returns correct ranges when max history is less than 7 days', async () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(5);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);

			const result = await insightsSettings.settings();

			expect(result.dateRanges).toEqual([
				{ key: 'day', licensed: false, granularity: 'hour' },
				{ key: 'week', licensed: false, granularity: 'day' },
				{ key: '2weeks', licensed: false, granularity: 'day' },
				{ key: 'month', licensed: false, granularity: 'day' },
				{ key: 'quarter', licensed: false, granularity: 'week' },
				{ key: '6months', licensed: false, granularity: 'week' },
				{ key: 'year', licensed: false, granularity: 'week' },
			]);
		});

		test('returns correct ranges when max history is 90 days and hourly data is enabled', async () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(90);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);

			const result = await insightsSettings.settings();

			expect(result.dateRanges).toEqual([
				{ key: 'day', licensed: true, granularity: 'hour' },
				{ key: 'week', licensed: true, granularity: 'day' },
				{ key: '2weeks', licensed: true, granularity: 'day' },
				{ key: 'month', licensed: true, granularity: 'day' },
				{ key: 'quarter', licensed: true, granularity: 'week' },
				{ key: '6months', licensed: false, granularity: 'week' },
				{ key: 'year', licensed: false, granularity: 'week' },
			]);
		});
	});
});
