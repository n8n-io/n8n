import { LicenseState } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { InsightsService } from '../insights.service';
import { InsightsProjectController } from '../insights-project.controller';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('InsightsProjectController', () => {
	const insightsService = mockInstance(InsightsService);
	let controller: InsightsProjectController;
	const licenseState = mock<LicenseState>();
	const projectId = 'test-project-123';

	beforeAll(() => {
		Container.set(LicenseState, licenseState);
		controller = Container.get(InsightsProjectController);
	});

	beforeEach(() => {
		jest.resetAllMocks();

		licenseState.getInsightsMaxHistory.mockReturnValue(-1);
		licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);
	});

	describe('getProjectInsightsSummary', () => {
		it('should pass projectId from route param to service', async () => {
			insightsService.getInsightsSummary.mockResolvedValue({
				total: { deviation: null, unit: 'count', value: 0 },
				failed: { deviation: null, unit: 'count', value: 0 },
				failureRate: { deviation: null, unit: 'ratio', value: 0 },
				averageRunTime: { deviation: null, unit: 'millisecond', value: 0 },
				timeSaved: { deviation: null, unit: 'minute', value: 0 },
			});

			await controller.getProjectInsightsSummary(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				projectId,
			);

			expect(insightsService.getInsightsSummary).toHaveBeenCalledWith(
				expect.objectContaining({ projectId }),
			);
		});

		it('should use route param projectId, ignoring query projectId', async () => {
			insightsService.getInsightsSummary.mockResolvedValue({
				total: { deviation: null, unit: 'count', value: 0 },
				failed: { deviation: null, unit: 'count', value: 0 },
				failureRate: { deviation: null, unit: 'ratio', value: 0 },
				averageRunTime: { deviation: null, unit: 'millisecond', value: 0 },
				timeSaved: { deviation: null, unit: 'minute', value: 0 },
			});

			await controller.getProjectInsightsSummary(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				'route-project-id',
			);

			expect(insightsService.getInsightsSummary).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'route-project-id' }),
			);
		});

		it('should throw a BadRequestError when endDate is before startDate', async () => {
			await expect(
				controller.getProjectInsightsSummary(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					projectId,
					{
						startDate: new Date('2025-06-10'),
						endDate: new Date('2025-06-01'),
					},
				),
			).rejects.toThrowError(new BadRequestError('endDate must be the same as or after startDate'));
		});
	});

	describe('getProjectInsightsByWorkflow', () => {
		it('should pass projectId from route param to service', async () => {
			insightsService.getInsightsByWorkflow.mockResolvedValue({
				count: 0,
				data: [],
			});

			await controller.getProjectInsightsByWorkflow(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				projectId,
				{ skip: 0, take: 5, sortBy: 'total:desc' },
			);

			expect(insightsService.getInsightsByWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ projectId }),
			);
		});
	});

	describe('getProjectInsightsByTime', () => {
		it('should pass projectId from route param to service', async () => {
			insightsService.getInsightsByTime.mockResolvedValue([]);

			await controller.getProjectInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				projectId,
				{},
			);

			expect(insightsService.getInsightsByTime).toHaveBeenCalledWith(
				expect.objectContaining({ projectId }),
			);
		});
	});

	describe('getProjectTimeSavedInsightsByTime', () => {
		it('should pass projectId from route param to service', async () => {
			insightsService.getInsightsByTime.mockResolvedValue([]);

			await controller.getProjectTimeSavedInsightsByTime(
				mock<AuthenticatedRequest>(),
				mock<Response>(),
				projectId,
				{},
			);

			expect(insightsService.getInsightsByTime).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId,
					insightTypes: ['time_saved_min'],
				}),
			);
		});
	});

	describe('license restrictions', () => {
		it('should throw a forbidden error when hourly data is requested without a license', async () => {
			licenseState.getInsightsMaxHistory.mockReturnValue(-1);
			licenseState.isInsightsHourlyDataLicensed.mockReturnValue(false);
			insightsService.validateDateFiltersLicense.mockImplementation(() => {
				throw new (require('n8n-workflow').UserError)(
					'Hourly data is not available with your current license',
				);
			});

			await expect(
				controller.getProjectInsightsSummary(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					projectId,
					{
						startDate: new Date('2025-06-01T00:00:00Z'),
						endDate: new Date('2025-06-01T00:00:00Z'),
					},
				),
			).rejects.toThrowError(
				new ForbiddenError('Hourly data is not available with your current license'),
			);
		});

		it('should throw a forbidden error when date range exceeds license limit', async () => {
			const outOfRangeStart = DateTime.now().startOf('day').minus({ days: 20 }).toJSDate();
			const endDate = DateTime.now().startOf('day').minus({ days: 4 }).toJSDate();

			licenseState.getInsightsMaxHistory.mockReturnValue(14);
			licenseState.isInsightsHourlyDataLicensed.mockReturnValue(true);
			insightsService.validateDateFiltersLicense.mockImplementation(() => {
				throw new (require('n8n-workflow').UserError)(
					'The selected date range exceeds the maximum history allowed by your license',
				);
			});

			await expect(
				controller.getProjectInsightsSummary(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					projectId,
					{
						startDate: outOfRangeStart,
						endDate,
					},
				),
			).rejects.toThrowError(
				new ForbiddenError(
					'The selected date range exceeds the maximum history allowed by your license',
				),
			);
		});
	});
});
