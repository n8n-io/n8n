import { LicenseState } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { TypeToNumber } from '../database/entities/insights-shared';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsController } from '../insights.controller';

function expectDatesClose(actual: Date, expected: Date, maxDriftMs?: number) {
	const maxDrift = maxDriftMs ?? 60000; // default to 1 minute
	expect(Math.abs(actual.getTime() - expected.getTime())).toBeLessThanOrEqual(maxDrift);
}

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('InsightsController', () => {
	const insightsByPeriodRepository = mockInstance(InsightsByPeriodRepository);
	let controller: InsightsController;
	const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
	const today = DateTime.now().toJSDate();
	const licenseState = mock<LicenseState>();

	beforeAll(() => {
		Container.set(LicenseState, licenseState);
		controller = Container.get(InsightsController);
	});

	beforeEach(() => {
		jest.resetAllMocks();

		licenseState.getInsightsMaxHistory.mockReturnValue(-1);
		licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);
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
			).toHaveBeenCalledWith({ startDate: expect.any(Date), endDate: expect.any(Date) });

			const callArgs =
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

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
			).toHaveBeenCalledWith(
				expect.objectContaining({
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					projectId: undefined,
				}),
			);

			const callArgs =
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

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
			).toHaveBeenCalledWith(
				expect.objectContaining({
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					projectId: undefined,
				}),
			);

			const callArgs =
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

			expect(response).toEqual({
				total: { deviation: 10, unit: 'count', value: 30 },
				failed: { deviation: 6, unit: 'count', value: 10 },
				failureRate: { deviation: 0.333 - 0.2, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: 300 / 30 - 40 / 20, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: 5, unit: 'minute', value: 10 },
			});
		});

		describe('with query filters', () => {
			const mockRepositoryResponse: Array<{
				period: 'previous' | 'current';
				type: 0 | 1 | 2 | 3;
				total_value: string | number;
			}> = [
				{ period: 'previous', type: TypeToNumber.success, total_value: 16 },
				{ period: 'previous', type: TypeToNumber.failure, total_value: 4 },
				{ period: 'previous', type: TypeToNumber.runtime_ms, total_value: 40 },
				{ period: 'previous', type: TypeToNumber.time_saved_min, total_value: 5 },
				{ period: 'current', type: TypeToNumber.success, total_value: 20 },
				{ period: 'current', type: TypeToNumber.failure, total_value: 10 },
				{ period: 'current', type: TypeToNumber.runtime_ms, total_value: 300 },
				{ period: 'current', type: TypeToNumber.time_saved_min, total_value: 10 },
			];

			const expectedResponse = {
				total: { deviation: 10, unit: 'count', value: 30 },
				failed: { deviation: 6, unit: 'count', value: 10 },
				failureRate: { deviation: 0.333 - 0.2, unit: 'ratio', value: 0.333 },
				averageRunTime: { deviation: 300 / 30 - 40 / 20, unit: 'millisecond', value: 10 },
				timeSaved: { deviation: 5, unit: 'minute', value: 10 },
			};

			it('should use the query filters when provided', async () => {
				const startDate = DateTime.now().minus({ days: 12, hours: 12 }).toJSDate();
				const endDate = DateTime.now().minus({ days: 4, hours: 5 }).toJSDate();

				// ARRANGE
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					mockRepositoryResponse,
				);

				// ACT
				const response = await controller.getInsightsSummary(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ startDate, endDate, projectId: 'test-project' },
				);

				expect(
					insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).toHaveBeenCalledWith({
					startDate,
					endDate,
					projectId: 'test-project',
				});

				expect(response).toEqual(expectedResponse);
			});

			it('should default the endDate to today when not provided', async () => {
				const startDate = DateTime.now().startOf('day').minus({ days: 12, minutes: 43 }).toJSDate();

				// ARRANGE
				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					mockRepositoryResponse,
				);

				// ACT
				const response = await controller.getInsightsSummary(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ startDate, projectId: 'test-project' },
				);

				expect(
					insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						startDate,
						endDate: expect.any(Date),
						projectId: 'test-project',
					}),
				);

				const callArgs =
					insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mock.calls[0][0];
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual(expectedResponse);
			});

			it('should use the query dateRange filter in a backward compatible way', async () => {
				const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toJSDate();

				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					mockRepositoryResponse,
				);

				const response = await controller.getInsightsSummary(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ dateRange: 'month', projectId: 'test-project' },
				);

				expect(
					insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						startDate: expect.any(Date),
						endDate: expect.any(Date),
						projectId: 'test-project',
					}),
				);

				const callArgs =
					insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mock.calls[0][0];
				expectDatesClose(callArgs.startDate, thirtyDaysAgo);
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual(expectedResponse);
			});

			it('should throw a BadRequestError when endDate is before startDate', async () => {
				await expect(
					controller.getInsightsSummary(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: new Date('2025-06-01'),
						projectId: 'test-project',
					}),
				).rejects.toThrowError(
					new BadRequestError('endDate must be the same as or after startDate'),
				);
			});

			it('should throw a BadRequestError when endDate is in the future', async () => {
				// ARRANGE
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in the future

				// ACT & ASSERT
				await expect(
					controller.getInsightsSummary(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: futureDate,
						projectId: 'test-project',
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});

			it('should throw a BadRequestError when startDate is in the future', async () => {
				// ARRANGE
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in the future

				// ACT & ASSERT
				await expect(
					controller.getInsightsSummary(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: futureDate,
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});
		});

		describe('with license restrictions', () => {
			it('should throw a forbidden error when hourly data is requested without a license', async () => {
				// ARRANGE
				licenseState.getInsightsMaxHistory.mockReturnValue(-1);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(false);

				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
					{ period: 'previous', type: TypeToNumber.success, total_value: 16 },
					{ period: 'current', type: TypeToNumber.success, total_value: 20 },
				]);

				// ACT & ASSERT
				await expect(
					controller.getInsightsSummary(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-01T00:00:00Z'),
						// same day as startDate to force 'hour' granularity
						endDate: new Date('2025-06-01T00:00:00Z'),
					}),
				).rejects.toThrowError(
					new ForbiddenError('Hourly data is not available with your current license'),
				);
			});

			it('should throw a forbidden error when date range exceeds license limit', async () => {
				// ARRANGE
				const outOfRangeStart = DateTime.now().startOf('day').minus({ days: 20 }).toJSDate();
				const endDate = DateTime.now().startOf('day').minus({ days: 4 }).toJSDate();

				licenseState.getInsightsMaxHistory.mockReturnValue(14);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);

				insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
					{ period: 'previous', type: TypeToNumber.success, total_value: 16 },
					{ period: 'current', type: TypeToNumber.success, total_value: 20 },
				]);

				// ACT & ASSERT
				await expect(
					controller.getInsightsSummary(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: outOfRangeStart,
						endDate,
					}),
				).rejects.toThrowError(
					new ForbiddenError(
						'The selected date range exceeds the maximum history allowed by your license',
					),
				);
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
				},
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				skip: 0,
				take: 5,
				sortBy: 'total:desc',
			});

			const callArgs = insightsByPeriodRepository.getInsightsByWorkflow.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

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
				},
			);

			// ASSERT
			expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				skip: 0,
				take: 5,
				sortBy: 'total:desc',
			});

			const callArgs = insightsByPeriodRepository.getInsightsByWorkflow.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

			expect(response).toEqual({ count: 3, data: mockRows });
		});

		describe('with query filters', () => {
			it('should use the query filters when provided', async () => {
				// ARRANGE
				const startDate = DateTime.now().minus({ days: 365 }).toJSDate();
				const endDate = DateTime.now().minus({ days: 335 }).toJSDate();
				insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
					count: mockRows.length,
					rows: mockRows,
				});

				// ACT
				const response = await controller.getInsightsByWorkflow(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{
						startDate,
						endDate,
						skip: 5,
						take: 10,
						sortBy: 'failureRate:asc',
						projectId: 'test-project',
					},
				);

				// ASSERT
				expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
					startDate,
					endDate,
					skip: 5,
					take: 10,
					sortBy: 'failureRate:asc',
					projectId: 'test-project',
				});

				expect(response).toEqual({ count: 3, data: mockRows });
			});

			it('should default the endDate to today when not provided', async () => {
				// ARRANGE
				const startDate = DateTime.now().startOf('day').minus({ days: 70 }).toJSDate();
				insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
					count: mockRows.length,
					rows: mockRows,
				});

				// ACT
				const response = await controller.getInsightsByWorkflow(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{
						startDate,
						skip: 0,
						take: 5,
						sortBy: 'total:desc',
					},
				);

				// ASSERT
				expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
					startDate,
					endDate: expect.any(Date),
					skip: 0,
					take: 5,
					sortBy: 'total:desc',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByWorkflow.mock.calls[0][0];
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual({ count: 3, data: mockRows });
			});

			it('should use the query dateRange filter in a backward compatible way', async () => {
				// ARRANGE
				const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toJSDate();
				insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
					count: mockRows.length,
					rows: mockRows,
				});

				// ACT
				const response = await controller.getInsightsByWorkflow(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{
						dateRange: 'month',
						skip: 0,
						take: 5,
						sortBy: 'total:desc',
					},
				);

				// ASSERT
				expect(insightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith({
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					skip: 0,
					take: 5,
					sortBy: 'total:desc',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByWorkflow.mock.calls[0][0];
				expectDatesClose(callArgs.startDate, thirtyDaysAgo);
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual({ count: 3, data: mockRows });
			});

			it('should throw a BadRequestError when endDate is before startDate', async () => {
				const startDate = DateTime.now().startOf('day').minus({ days: 10 }).toJSDate();
				const endDate = DateTime.now().startOf('day').minus({ days: 12 }).toJSDate();

				await expect(
					controller.getInsightsByWorkflow(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate,
						endDate,
						skip: 0,
						take: 5,
						sortBy: 'total:desc',
					}),
				).rejects.toThrowError(
					new BadRequestError('endDate must be the same as or after startDate'),
				);
			});

			it('should throw a BadRequestError when endDate is in the future', async () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in the future

				await expect(
					controller.getInsightsByWorkflow(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: futureDate,
						skip: 20,
						take: 5,
						projectId: 'test-project',
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});

			it('should throw a BadRequestError when startDate is in the future', async () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in the future

				await expect(
					controller.getInsightsByWorkflow(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: futureDate,
						skip: 0,
						take: 5,
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});
		});

		describe('with license restrictions', () => {
			it('should throw a forbidden error when hourly data is requested without a license', async () => {
				// ARRANGE
				licenseState.getInsightsMaxHistory.mockReturnValue(30);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(false);

				insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
					count: 0,
					rows: [],
				});

				// ACT & ASSERT
				await expect(
					controller.getInsightsByWorkflow(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-01T00:00:00Z'),
						endDate: new Date('2025-06-01T00:00:00Z'),
						skip: 0,
						take: 5,
						sortBy: 'total:desc',
					}),
				).rejects.toThrowError(
					new ForbiddenError('Hourly data is not available with your current license'),
				);
			});

			it('should throw a forbidden error when date range exceeds license limit', async () => {
				// ARRANGE
				const outOfRangeStart = DateTime.now().startOf('day').minus({ days: 32 }).toJSDate();
				const endDate = DateTime.now().startOf('day').minus({ days: 4 }).toJSDate();

				licenseState.getInsightsMaxHistory.mockReturnValue(31);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);

				insightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
					count: 0,
					rows: [],
				});

				// ACT & ASSERT
				await expect(
					controller.getInsightsByWorkflow(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: outOfRangeStart,
						endDate,
						skip: 0,
						take: 5,
						sortBy: 'total:desc',
					}),
				).rejects.toThrowError(
					new ForbiddenError(
						'The selected date range exceeds the maximum history allowed by your license',
					),
				);
			});
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

		const expectedResponse = [
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
		];

		it('should return insights by time with empty data', async () => {
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

			const response = await controller.getInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{},
			);

			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				periodUnit: 'day',
			});

			const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

			expect(response).toEqual([]);
		});

		it('should return insights by time', async () => {
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

			const response = await controller.getInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{},
			);

			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				periodUnit: 'day',
			});

			const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

			expect(response).toEqual(expectedResponse);
		});

		describe('with query filters', () => {
			it('should use the query filters for startDate and endDate when provided', async () => {
				const startDate = DateTime.now().minus({ days: 365 }).toJSDate();
				const endDate = DateTime.now().minus({ days: 365 }).toJSDate();
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				const response = await controller.getInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ startDate, endDate },
				);

				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
					startDate,
					endDate,
					periodUnit: 'hour',
				});

				expect(response).toEqual(expectedResponse);
			});

			it('should use the query filters for projectId when provided', async () => {
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				const response = await controller.getInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ projectId: 'test-project' },
				);

				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					periodUnit: 'day',
					projectId: 'test-project',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
				expectDatesClose(callArgs.startDate, sevenDaysAgo);
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual(expectedResponse);
			});

			it('should default the endDate to today when not provided', async () => {
				const startDate = DateTime.now().startOf('day').minus({ years: 1 }).toJSDate();
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				const response = await controller.getInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ startDate },
				);

				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
					startDate,
					endDate: expect.any(Date),
					periodUnit: 'week',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual(expectedResponse);
			});

			it('should use the query dateRange filter in a backward compatible way', async () => {
				const fourteenDaysAgo = DateTime.now().minus({ days: 14 }).toJSDate();
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				const response = await controller.getInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ dateRange: '2weeks', projectId: 'test-project' },
				);

				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					periodUnit: 'day',
					projectId: 'test-project',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
				expectDatesClose(callArgs.startDate, fourteenDaysAgo);
				expectDatesClose(callArgs.endDate, today);
				expect(response).toEqual(expectedResponse);
			});

			it('should throw a BadRequestError when endDate is before startDate', async () => {
				await expect(
					controller.getInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: new Date('2025-06-01'),
					}),
				).rejects.toThrowError(
					new BadRequestError('endDate must be the same as or after startDate'),
				);
			});

			it('should throw a BadRequestError when endDate is in the future', async () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await expect(
					controller.getInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: futureDate,
						projectId: 'test-project',
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});

			it('should throw a BadRequestError when startDate is in the future', async () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await expect(
					controller.getInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: futureDate,
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});
		});

		describe('with license restrictions', () => {
			it('should throw a forbidden error when hourly data is requested without a license', async () => {
				licenseState.getInsightsMaxHistory.mockReturnValue(30);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(false);

				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

				await expect(
					controller.getInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-01T00:00:00Z'),
						endDate: new Date('2025-06-01T00:00:00Z'),
					}),
				).rejects.toThrowError(
					new ForbiddenError('Hourly data is not available with your current license'),
				);
			});

			it('should throw a forbidden error when date range exceeds license limit', async () => {
				const outOfRangeStart = DateTime.now().startOf('day').minus({ months: 2 }).toJSDate();
				const endDate = DateTime.now().startOf('day').minus({ days: 4 }).toJSDate();

				licenseState.getInsightsMaxHistory.mockReturnValue(14);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);

				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

				await expect(
					controller.getInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: outOfRangeStart,
						endDate,
					}),
				).rejects.toThrowError(
					new ForbiddenError(
						'The selected date range exceeds the maximum history allowed by your license',
					),
				);
			});
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

		const expectedResponse = [
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
		];

		it('should return insights by time with limited data', async () => {
			insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

			const response = await controller.getTimeSavedInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				{},
			);

			expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
				insightTypes: ['time_saved_min'],
				startDate: expect.any(Date),
				endDate: expect.any(Date),
				periodUnit: 'day',
			});

			const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
			expectDatesClose(callArgs.startDate, sevenDaysAgo);
			expectDatesClose(callArgs.endDate, today);

			expect(response).toEqual(expectedResponse);
		});

		describe('with query filters', () => {
			it('should use the query filters for projectId when provided', async () => {
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				const response = await controller.getTimeSavedInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ projectId: 'test-project' },
				);

				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min'],
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					periodUnit: 'day',
					projectId: 'test-project',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
				expectDatesClose(callArgs.startDate, sevenDaysAgo);
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual(expectedResponse);
			});

			it('should use the query filters for startDate and endDate when provided', async () => {
				const startDate = DateTime.now().startOf('day').minus({ days: 90 }).toJSDate();
				const endDate = today;
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				const response = await controller.getTimeSavedInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ startDate, endDate },
				);

				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min'],
					startDate,
					endDate,
					periodUnit: 'week',
				});

				expect(response).toEqual(expectedResponse);
			});

			it('should use the query dateRange filter "quarter" in a backward compatible way', async () => {
				// ARRANGE
				const ninetyDaysAgo = DateTime.now().minus({ days: 90 }).toJSDate();
				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue(mockData);

				// ACT
				const response = await controller.getTimeSavedInsightsByTime(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					{ dateRange: 'quarter', projectId: 'test-project' },
				);

				// ASSERT
				expect(insightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith({
					insightTypes: ['time_saved_min'],
					startDate: expect.any(Date),
					endDate: expect.any(Date),
					periodUnit: 'week',
					projectId: 'test-project',
				});

				const callArgs = insightsByPeriodRepository.getInsightsByTime.mock.calls[0][0];
				expectDatesClose(callArgs.startDate, ninetyDaysAgo);
				expectDatesClose(callArgs.endDate, today);

				expect(response).toEqual(expectedResponse);
			});

			it('should throw a BadRequestError when endDate is before startDate', async () => {
				await expect(
					controller.getTimeSavedInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: new Date('2025-06-01'),
					}),
				).rejects.toThrowError(
					new BadRequestError('endDate must be the same as or after startDate'),
				);
			});

			it('should throw a BadRequestError when endDate is in the future', async () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await expect(
					controller.getTimeSavedInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-10'),
						endDate: futureDate,
						projectId: 'test-project',
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});

			it('should throw a BadRequestError when startDate is in the future', async () => {
				const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await expect(
					controller.getTimeSavedInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: futureDate,
					}),
				).rejects.toThrowError(new BadRequestError('must be in the past'));
			});
		});

		describe('with license restrictions', () => {
			it('should throw a forbidden error when hourly data is requested without a license', async () => {
				licenseState.getInsightsMaxHistory.mockReturnValue(30);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(false);

				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

				await expect(
					controller.getTimeSavedInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: new Date('2025-06-01T00:00:00Z'),
						endDate: new Date('2025-06-01T00:00:00Z'),
					}),
				).rejects.toThrowError(
					new ForbiddenError('Hourly data is not available with your current license'),
				);
			});

			it('should throw a forbidden error when date range exceeds license limit', async () => {
				const outOfRangeStart = DateTime.now().startOf('day').minus({ days: 32 }).toJSDate();
				const endDate = DateTime.now().startOf('day').minus({ days: 4 }).toJSDate();

				licenseState.getInsightsMaxHistory.mockReturnValue(31);
				licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);

				insightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

				await expect(
					controller.getTimeSavedInsightsByTime(mock<AuthenticatedRequest>(), mock<Response>(), {
						startDate: outOfRangeStart,
						endDate,
					}),
				).rejects.toThrowError(
					new ForbiddenError(
						'The selected date range exceeds the maximum history allowed by your license',
					),
				);
			});
		});
	});
});
