'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const insights_shared_1 = require('../database/entities/insights-shared');
const insights_by_period_repository_1 = require('../database/repositories/insights-by-period.repository');
const insights_controller_1 = require('../insights.controller');
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	di_1.Container.set(
		backend_common_1.LicenseState,
		(0, jest_mock_extended_1.mock)({
			getInsightsMaxHistory: jest.fn().mockReturnValue(-1),
		}),
	);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('InsightsController', () => {
	const insightsByPeriodRepository = (0, backend_test_utils_1.mockInstance)(
		insights_by_period_repository_1.InsightsByPeriodRepository,
	);
	let controller;
	beforeAll(async () => {
		controller = di_1.Container.get(insights_controller_1.InsightsController);
	});
	describe('getInsightsSummary', () => {
		it('should return default insights if no data', async () => {
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([]);
			const response = await controller.getInsightsSummary(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			expect(response).toEqual({
				total: { deviation: null, unit: 'count', value: 0 },
				failed: { deviation: null, unit: 'count', value: 0 },
				failureRate: { deviation: null, unit: 'ratio', value: 0 },
				averageRunTime: { deviation: null, unit: 'millisecond', value: 0 },
				timeSaved: { deviation: null, unit: 'minute', value: 0 },
			});
		});
		it('should return the insights summary with null deviation if insights exist only for current period', async () => {
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
				{ period: 'current', type: insights_shared_1.TypeToNumber.success, total_value: 20 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.failure, total_value: 10 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.runtime_ms, total_value: 300 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.time_saved_min, total_value: 10 },
			]);
			const response = await controller.getInsightsSummary(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			expect(response).toEqual({
				total: { deviation: null, unit: 'count', value: 30 },
				failed: { deviation: null, unit: 'count', value: 10 },
				failureRate: { deviation: null, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: null, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: null, unit: 'minute', value: 10 },
			});
		});
		it('should return the insights summary if insights exist for both periods', async () => {
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
				{ period: 'previous', type: insights_shared_1.TypeToNumber.success, total_value: 16 },
				{ period: 'previous', type: insights_shared_1.TypeToNumber.failure, total_value: 4 },
				{ period: 'previous', type: insights_shared_1.TypeToNumber.runtime_ms, total_value: 40 },
				{ period: 'previous', type: insights_shared_1.TypeToNumber.time_saved_min, total_value: 5 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.success, total_value: 20 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.failure, total_value: 10 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.runtime_ms, total_value: 300 },
				{ period: 'current', type: insights_shared_1.TypeToNumber.time_saved_min, total_value: 10 },
			]);
			const response = await controller.getInsightsSummary(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			expect(response).toEqual({
				total: { deviation: 10, unit: 'count', value: 30 },
				failed: { deviation: 6, unit: 'count', value: 10 },
				failureRate: { deviation: 0.333 - 0.2, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: 300 / 30 - 40 / 20, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: 5, unit: 'minute', value: 10 },
			});
		});
	});
	describe('getInsightsByTime', () => {
		it('should return insights by time with empty data', async () => {
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);
			const response = await controller.getInsightsByTime(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				{ dateRange: 'week' },
			);
			expect(response).toEqual([]);
		});
		it('should return insights by time with all data', async () => {
			const mockData = [
				{
					periodStart: '2023-10-01T00:00:00.000Z',
					succeeded: 10,
					timeSaved: 0,
					failed: 2,
					runTime: 10,
				},
				{
					periodStart: '2023-10-02T00:00:00.000Z',
					succeeded: 12,
					timeSaved: 0,
					failed: 4,
					runTime: 10,
				},
			];
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);
			const response = await controller.getInsightsByTime(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				{ dateRange: 'year' },
			);
			expect(response).toEqual([
				{
					date: '2023-10-01T00:00:00.000Z',
					values: {
						succeeded: 10,
						timeSaved: 0,
						failed: 2,
						averageRunTime: 10 / 12,
						failureRate: 2 / 12,
						total: 12,
					},
				},
				{
					date: '2023-10-02T00:00:00.000Z',
					values: {
						succeeded: 12,
						timeSaved: 0,
						failed: 4,
						averageRunTime: 10 / 16,
						failureRate: 4 / 16,
						total: 16,
					},
				},
			]);
		});
	});
	describe('getTimeSavedInsightsByTime', () => {
		it('should return insights by time with limited data', async () => {
			const mockData = [
				{
					periodStart: '2023-10-01T00:00:00.000Z',
					timeSaved: 0,
				},
				{
					periodStart: '2023-10-02T00:00:00.000Z',
					timeSaved: 2,
				},
			];
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);
			const response = await controller.getTimeSavedInsightsByTime(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				{ dateRange: 'week' },
			);
			expect(response).toEqual([
				{
					date: '2023-10-01T00:00:00.000Z',
					values: {
						timeSaved: 0,
					},
				},
				{
					date: '2023-10-02T00:00:00.000Z',
					values: {
						timeSaved: 2,
					},
				},
			]);
		});
	});
});
//# sourceMappingURL=insights.controller.test.js.map
