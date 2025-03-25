import { Container } from '@n8n/di';

import { mockInstance } from '@test/mocking';
import * as testDb from '@test-integration/test-db';

import { TypeToNumber } from '../entities/insights-shared';
import { InsightsController } from '../insights.controller';
import { InsightsByPeriodRepository } from '../repositories/insights-by-period.repository';

// Initialize DB once for all tests
beforeAll(async () => {
	await testDb.init();
});

// Terminate DB once after all tests complete
afterAll(async () => {
	await testDb.terminate();
});

describe('InsightsController', () => {
	const insightsByPeriodRepository = mockInstance(InsightsByPeriodRepository);
	let controller: InsightsController;
	beforeAll(async () => {
		controller = Container.get(InsightsController);
	});

	describe('getInsightsSummary', () => {
		it('should return default insights if no data', async () => {
			// ARRANGE
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([]);

			// ACT
			const response = await controller.getInsightsSummary();

			// ASSERT
			expect(response).toEqual({
				total: { deviation: 0, unit: 'count', value: 0 },
				failed: { deviation: 0, unit: 'count', value: 0 },
				failureRate: { deviation: 0, unit: 'ratio', value: 0 },
				averageRunTime: { deviation: 0, unit: 'time', value: 0 },
				timeSaved: { deviation: 0, unit: 'time', value: 0 },
			});
		});

		it('should return the insights summary with deviation = current if insights exist only for current period', async () => {
			// ARRANGE
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
				{ period: 'current', type: TypeToNumber.success, total_value: 20 },
				{ period: 'current', type: TypeToNumber.failure, total_value: 10 },
				{ period: 'current', type: TypeToNumber.runtime_ms, total_value: 300 },
				{ period: 'current', type: TypeToNumber.time_saved_min, total_value: 10 },
			]);

			// ACT
			const response = await controller.getInsightsSummary();

			// ASSERT
			expect(response).toEqual({
				total: { deviation: 30, unit: 'count', value: 30 },
				failed: { deviation: 10, unit: 'count', value: 10 },
				failureRate: { deviation: 0.33, unit: 'ratio', value: 0.33 },
				averageRunTime: { deviation: 10, unit: 'time', value: 10 },
				timeSaved: { deviation: 10, unit: 'time', value: 10 },
			});
		});

		it('should return the insights summary if insights exist for both periods', async () => {
			// ARRANGE
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
				{ period: 'previous', type: TypeToNumber.success, total_value: 16 },
				{ period: 'previous', type: TypeToNumber.failure, total_value: 4 },
				{ period: 'previous', type: TypeToNumber.runtime_ms, total_value: 40 },
				{ period: 'previous', type: TypeToNumber.time_saved_min, total_value: 5 },
				{ period: 'current', type: TypeToNumber.success, total_value: 20 },
				{ period: 'current', type: TypeToNumber.failure, total_value: 10 },
				{ period: 'current', type: TypeToNumber.runtime_ms, total_value: 300 },
				{ period: 'current', type: TypeToNumber.time_saved_min, total_value: 10 },
			]);

			// ACT
			const response = await controller.getInsightsSummary();

			// ASSERT
			expect(response).toEqual({
				total: { deviation: 10, unit: 'count', value: 30 },
				failed: { deviation: 6, unit: 'count', value: 10 },
				failureRate: { deviation: 0.33 - 0.2, unit: 'ratio', value: 0.33 },
				averageRunTime: { deviation: 300 / 30 - 40 / 20, unit: 'time', value: 10 },
				timeSaved: { deviation: 5, unit: 'time', value: 10 },
			});
		});
	});
});
