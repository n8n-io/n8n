import {
	fetchInsightsByTime,
	fetchInsightsTimeSaved,
	fetchInsightsByWorkflow,
	serializeInsightsFilter,
} from '@/features/execution/insights/insights.api';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type {
	InsightsByTime,
	InsightsByWorkflow,
	ListInsightsWorkflowQueryDto,
	InsightsDateFilterDto,
} from '@n8n/api-types';
import { expect } from 'vitest';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

describe('insights.api', () => {
	const mockContext = { baseUrl: '/rest', pushRef: 'test-push-ref' };

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('serializeInsightsFilter', () => {
		it('should return undefined when filter is undefined', () => {
			const result = serializeInsightsFilter(undefined);
			expect(result).toBeUndefined();
		});

		it('should serialize filter with Date objects to ISO strings', () => {
			const startDate = new Date('2025-01-01T00:00:00.000Z');
			const endDate = new Date('2025-01-31T23:59:59.999Z');

			const filter: InsightsDateFilterDto = {
				startDate,
				endDate,
			};

			const result = serializeInsightsFilter(filter);

			expect(result).toEqual({
				startDate: '2025-01-01T00:00:00.000Z',
				endDate: '2025-01-31T23:59:59.999Z',
			});
		});

		it('should handle filter with only startDate', () => {
			const startDate = new Date('2025-01-01T00:00:00.000Z');

			const filter: InsightsDateFilterDto = {
				startDate,
			};

			const result = serializeInsightsFilter(filter);

			expect(result).toEqual({
				startDate: '2025-01-01T00:00:00.000Z',
			});
		});

		it('should handle filter with only endDate', () => {
			const endDate = new Date('2025-01-31T23:59:59.999Z');

			const filter: InsightsDateFilterDto = {
				endDate,
			};

			const result = serializeInsightsFilter(filter);

			expect(result).toEqual({
				endDate: '2025-01-31T23:59:59.999Z',
			});
		});

		it('should preserve additional filter properties', () => {
			const startDate = new Date('2025-01-01T00:00:00.000Z');
			const endDate = new Date('2025-01-31T23:59:59.999Z');

			const filter: ListInsightsWorkflowQueryDto = {
				startDate,
				endDate,
				take: 10,
				skip: 0,
				sortBy: 'workflowName:asc',
			};

			const result = serializeInsightsFilter(filter);

			expect(result).toEqual({
				startDate: '2025-01-01T00:00:00.000Z',
				endDate: '2025-01-31T23:59:59.999Z',
				take: 10,
				skip: 0,
				sortBy: 'workflowName:asc',
			});
		});

		it('should handle empty filter object', () => {
			const filter: InsightsDateFilterDto = {};

			const result = serializeInsightsFilter(filter);

			expect(result).toEqual({});
		});
	});

	describe('fetchInsightsByTime', () => {
		it('should make GET request to /insights/by-time without filter', async () => {
			const mockInsightsByTime: InsightsByTime[] = [
				{
					date: '2025-01-01T00:00:00.000Z',
					values: {
						total: 10,
						succeeded: 8,
						failed: 2,
						failureRate: 0.2,
						averageRunTime: 5000,
						timeSaved: 30,
					},
				},
				{
					date: '2025-01-02T00:00:00.000Z',
					values: {
						total: 15,
						succeeded: 12,
						failed: 3,
						failureRate: 0.2,
						averageRunTime: 4500,
						timeSaved: 45,
					},
				},
			];

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockInsightsByTime);

			const result = await fetchInsightsByTime(mockContext);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				mockContext,
				'GET',
				'/insights/by-time',
				undefined,
			);
			expect(result).toEqual(mockInsightsByTime);
		});

		it('should make GET request to /insights/by-time with serialized filter', async () => {
			const startDate = new Date('2025-01-01T00:00:00.000Z');
			const endDate = new Date('2025-01-31T23:59:59.999Z');

			const filter: InsightsDateFilterDto = {
				startDate,
				endDate,
			};

			const mockInsightsByTime: InsightsByTime[] = [
				{
					date: '2025-01-15T00:00:00.000Z',
					values: {
						total: 20,
						succeeded: 18,
						failed: 2,
						failureRate: 0.1,
						averageRunTime: 4000,
						timeSaved: 60,
					},
				},
			];

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockInsightsByTime);

			const result = await fetchInsightsByTime(mockContext, filter);

			expect(makeRestApiRequest).toHaveBeenCalledWith(mockContext, 'GET', '/insights/by-time', {
				startDate: '2025-01-01T00:00:00.000Z',
				endDate: '2025-01-31T23:59:59.999Z',
			});
			expect(result).toEqual(mockInsightsByTime);
		});
	});

	describe('fetchInsightsTimeSaved', () => {
		it('should make GET request to /insights/by-time/time-saved without filter', async () => {
			const mockTimeSaved: InsightsByTime[] = [
				{
					date: '2025-01-01T00:00:00.000Z',
					values: {
						total: 10,
						succeeded: 8,
						failed: 2,
						failureRate: 0.2,
						averageRunTime: 5000,
						timeSaved: 60,
					},
				},
				{
					date: '2025-01-02T00:00:00.000Z',
					values: {
						total: 15,
						succeeded: 12,
						failed: 3,
						failureRate: 0.2,
						averageRunTime: 4500,
						timeSaved: 90,
					},
				},
			];

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockTimeSaved);

			const result = await fetchInsightsTimeSaved(mockContext);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				mockContext,
				'GET',
				'/insights/by-time/time-saved',
				undefined,
			);
			expect(result).toEqual(mockTimeSaved);
		});

		it('should make GET request to /insights/by-time/time-saved with serialized filter', async () => {
			const startDate = new Date('2025-01-01T00:00:00.000Z');
			const endDate = new Date('2025-01-31T23:59:59.999Z');

			const filter: InsightsDateFilterDto = {
				startDate,
				endDate,
			};

			const mockTimeSaved: InsightsByTime[] = [
				{
					date: '2025-01-15T00:00:00.000Z',
					values: {
						total: 20,
						succeeded: 18,
						failed: 2,
						failureRate: 0.1,
						averageRunTime: 4000,
						timeSaved: 120,
					},
				},
			];

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockTimeSaved);

			const result = await fetchInsightsTimeSaved(mockContext, filter);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				mockContext,
				'GET',
				'/insights/by-time/time-saved',
				{
					startDate: '2025-01-01T00:00:00.000Z',
					endDate: '2025-01-31T23:59:59.999Z',
				},
			);
			expect(result).toEqual(mockTimeSaved);
		});
	});

	describe('fetchInsightsByWorkflow', () => {
		it('should make GET request to /insights/by-workflow without filter', async () => {
			const mockInsightsByWorkflow: InsightsByWorkflow = {
				data: [
					{
						workflowId: 'workflow-1',
						workflowName: 'Test Workflow 1',
						hasReadAccess: true,
						projectId: 'project-1',
						projectName: 'Test Project',
						total: 50,
						succeeded: 40,
						failed: 10,
						failureRate: 0.2,
						runTime: 250000,
						averageRunTime: 5000,
						timeSaved: 150,
					},
				],
				count: 1,
			};

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockInsightsByWorkflow);

			const result = await fetchInsightsByWorkflow(mockContext);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				mockContext,
				'GET',
				'/insights/by-workflow',
				undefined,
			);
			expect(result).toEqual(mockInsightsByWorkflow);
		});

		it('should make GET request to /insights/by-workflow with serialized filter', async () => {
			const startDate = new Date('2025-01-01T00:00:00.000Z');
			const endDate = new Date('2025-01-31T23:59:59.999Z');

			const filter: ListInsightsWorkflowQueryDto = {
				startDate,
				endDate,
				take: 10,
				skip: 0,
				sortBy: 'workflowName:asc',
			};

			const mockInsightsByWorkflow: InsightsByWorkflow = {
				data: [
					{
						workflowId: 'workflow-1',
						workflowName: 'Test Workflow 1',
						hasReadAccess: true,
						projectId: 'project-1',
						projectName: 'Test Project 1',
						total: 30,
						succeeded: 25,
						failed: 5,
						failureRate: 0.17,
						runTime: 120000,
						averageRunTime: 4000,
						timeSaved: 90,
					},
					{
						workflowId: 'workflow-2',
						workflowName: 'Test Workflow 2',
						hasReadAccess: true,
						projectId: 'project-2',
						projectName: 'Test Project 2',
						total: 20,
						succeeded: 18,
						failed: 2,
						failureRate: 0.1,
						runTime: 80000,
						averageRunTime: 4000,
						timeSaved: 60,
					},
				],
				count: 2,
			};

			vi.mocked(makeRestApiRequest).mockResolvedValue(mockInsightsByWorkflow);

			const result = await fetchInsightsByWorkflow(mockContext, filter);

			expect(makeRestApiRequest).toHaveBeenCalledWith(mockContext, 'GET', '/insights/by-workflow', {
				startDate: '2025-01-01T00:00:00.000Z',
				endDate: '2025-01-31T23:59:59.999Z',
				take: 10,
				skip: 0,
				sortBy: 'workflowName:asc',
			});
			expect(result).toEqual(mockInsightsByWorkflow);
		});
	});
});
