import { LicenseState } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { TypeToNumber } from '../database/entities/insights-shared';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsController } from '../insights.controller';

beforeAll(async () => {
	await testDb.init();
	Container.set(
		LicenseState,
		mock<LicenseState>({
			getInsightsMaxHistory: jest.fn().mockReturnValue(-1),
		}),
	);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('InsightsController', () => {
	const insightsByPeriodRepository = mockInstance(InsightsByPeriodRepository);
	let controller: InsightsController;

	beforeAll(async () => {
		controller = Container.get(InsightsController);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getInsightsSummary', () => {
		it('should return default insights if no data', async () => {
			// ARRANGE
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([]);

			// ACT
			const response = await controller.getInsightsSummary(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
			);

			// ASSERT
			expect(
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
			).toHaveBeenCalledWith({ periodLengthInDays: 7 });

			expect(response).toEqual({
				total: { deviation: null, unit: 'count', value: 0 },
				failed: { deviation: null, unit: 'count', value: 0 },
				failureRate: { deviation: null, unit: 'ratio', value: 0 },
				averageRunTime: { deviation: null, unit: 'millisecond', value: 0 },
				timeSaved: { deviation: null, unit: 'minute', value: 0 },
			});
		});

		it('should return the insights summary with null deviation if insights exist only for current period', async () => {
			// ARRANGE
			insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
				{ period: 'current', type: TypeToNumber.success, total_value: 20 },
				{ period: 'current', type: TypeToNumber.failure, total_value: 10 },
				{ period: 'current', type: TypeToNumber.runtime_ms, total_value: 300 },
				{ period: 'current', type: TypeToNumber.time_saved_min, total_value: 10 },
			]);

			// ACT
			const response = await controller.getInsightsSummary(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
			);

			// ASSERT
			expect(
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
			).toHaveBeenCalledWith({ periodLengthInDays: 7 });

			expect(response).toEqual({
				total: { deviation: null, unit: 'count', value: 30 },
				failed: { deviation: null, unit: 'count', value: 10 },
				failureRate: { deviation: null, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: null, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: null, unit: 'minute', value: 10 },
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
			const response = await controller.getInsightsSummary(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
			);

			// ASSERT
			expect(
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
			).toHaveBeenCalledWith({ periodLengthInDays: 7 });

			expect(response).toEqual({
				total: { deviation: 10, unit: 'count', value: 30 },
				failed: { deviation: 6, unit: 'count', value: 10 },
				failureRate: { deviation: 0.333 - 0.2, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: 300 / 30 - 40 / 20, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: 5, unit: 'minute', value: 10 },
			});
		});

		it('should use the query filters when provided', async () => {
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
			const response = await controller.getInsightsSummary(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{ dateRange: 'month', projectId: 'test-project' },
			);

			expect(
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
			).toHaveBeenCalledWith({
				periodLengthInDays: 30,
				projectId: 'test-project',
			});

			expect(response).toEqual({
				total: { deviation: 10, unit: 'count', value: 30 },
				failed: { deviation: 6, unit: 'count', value: 10 },
				failureRate: { deviation: 0.333 - 0.2, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: 300 / 30 - 40 / 20, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: 5, unit: 'minute', value: 10 },
			});
		});
	});

	describe('getInsightsByWorkflow', () => {
		const mockRows = [
			{
				workflowId: 'workflow-1',
				workflowName: 'Workflow A',
				projectId: 'project-1',
				projectName: 'Project Alpha',
				total: 30664,
				succeeded: 30077,
				failed: 587,
				failureRate: 0.019142968953822073,
				runTime: 1587932583,
				averageRunTime: 51784.91335116097,
				timeSaved: 0,
			},
			{
				workflowId: 'workflow-2',
				workflowName: 'Workflow B',
				projectId: 'project-1',
				projectName: 'Project Alpha',
				total: 27332,
				succeeded: 27332,
				failed: 0,
				failureRate: 0,
				runTime: 1880,
				averageRunTime: 0.06878384311429826,
				timeSaved: 0,
			},
			{
				workflowId: 'workflow-3',
				workflowName: 'Workflow C',
				projectId: 'project-1',
				projectName: 'Project Alpha',
				total: 15167,
				succeeded: 14956,
				failed: 211,
				failureRate: 0.013911782158633876,
				runTime: 899930618,
				averageRunTime: 59334.78064218369,
				timeSaved: 0,
			},
		];

		it('should return empty insights by workflow if no data', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({ count: 0, rows: [] });

			// ACT
			const response = await controller.getInsightsByWorkflow(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{
					skip: 0,
					take: 5,
					sortBy: 'total:desc',
					dateRange: 'week',
				},
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
				maxAgeInDays: 7,
				skip: 0,
				take: 5,
				sortBy: 'total:desc',
			});

			expect(response).toEqual({ count: 0, data: [] });
		});

		it('should return insights by workflow', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
				count: mockRows.length,
				rows: mockRows,
			});

			// ACT
			const response = await controller.getInsightsByWorkflow(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{
					skip: 0,
					take: 5,
					sortBy: 'total:desc',
					dateRange: 'week',
				},
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
				maxAgeInDays: 7,
				skip: 0,
				take: 5,
				sortBy: 'total:desc',
			});

			expect(response).toEqual({ count: 3, data: mockRows });
		});

		it('should use the query filters when provided', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
				count: mockRows.length,
				rows: mockRows,
			});

			// ACT
			const response = await controller.getInsightsByWorkflow(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{
					skip: 5,
					take: 10,
					sortBy: 'failureRate:asc',
					dateRange: 'month',
					projectId: 'test-project',
				},
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
				maxAgeInDays: 30,
				skip: 5,
				take: 10,
				sortBy: 'failureRate:asc',
				projectId: 'test-project',
			});

			expect(response).toEqual({ count: 3, data: mockRows });
		});
	});

	describe('getInsightsByTime', () => {
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

		it('should return insights by time with empty data', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

			// ACT
			const response = await controller.getInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{ dateRange: 'week' },
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
				maxAgeInDays: 7,
				periodUnit: 'day',
			});
			expect(response).toEqual([]);
		});

		it('should return insights by time', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

			// ACT
			const response = await controller.getInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{ dateRange: 'year' },
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
				maxAgeInDays: 365,
				periodUnit: 'week',
			});

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

		it('should use the projectId query filters when provided', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

			// ACT
			const response = await controller.getInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{ dateRange: 'month', projectId: 'test-project' },
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
				maxAgeInDays: 30,
				periodUnit: 'day',
				projectId: 'test-project',
			});

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

		it('should return insights by time with limited data', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

			// ACT
			const response = await controller.getTimeSavedInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{ dateRange: 'week' },
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min'],
				maxAgeInDays: 7,
				periodUnit: 'day',
			});

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

		it('should use the projectId query filters when provided', async () => {
			// ARRANGE
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

			// ACT
			const response = await controller.getTimeSavedInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{ dateRange: 'month', projectId: 'test-project' },
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min'],
				maxAgeInDays: 30,
				periodUnit: 'day',
				projectId: 'test-project',
			});

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
