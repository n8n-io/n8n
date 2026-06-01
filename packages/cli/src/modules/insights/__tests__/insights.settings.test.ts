import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { InsightsSettings } from '../insights.settings';

describe('InsightsSettings', () => {
	let licenseMock: jest.Mocked<LicenseState>;
	let insightsSettings: InsightsSettings;

	beforeAll(() => {
		licenseMock = mock<LicenseState>();
		insightsSettings = new InsightsSettings(licenseMock);
	});

	test('returns correct summary and dashboard licenses', () => {
		licenseMock.isInsightsSummaryLicensed.mockReturnValue(true);
		licenseMock.isInsightsDashboardLicensed.mockReturnValue(true);

		const result = insightsSettings.settings();

		expect(result.summary).toBe(true);
		expect(result.dashboard).toBe(true);
	});

	describe('dateRanges', () => {
		test('returns correct ranges when hourly data is enabled and max history is unlimited', () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(-1);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);

			const result = insightsSettings.settings();

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

		test('returns correct ranges when hourly data is enabled and max history is 365 days', () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(365);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);

			const result = insightsSettings.settings();

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

		test('returns correct ranges when hourly data is disabled and max history is 30 days', () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(30);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);

			const result = insightsSettings.settings();

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

		test('returns correct ranges when max history is less than 7 days', () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(5);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(false);

			const result = insightsSettings.settings();

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

		test('returns correct ranges when max history is 90 days and hourly data is enabled', () => {
			licenseMock.getInsightsMaxHistory.mockReturnValue(90);
			licenseMock.isInsightsHourlyDataLicensed.mockReturnValue(true);

			const result = insightsSettings.settings();

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
