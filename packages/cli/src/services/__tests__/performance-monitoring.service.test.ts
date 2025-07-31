import {
	ExecutionStatus,
	BottleneckSeverity,
	BottleneckIssue,
	NodeExecutionStatus,
} from '@n8n/api-types';
import { ApplicationError } from 'n8n-workflow';
import type { IRunData, IRunExecutionData } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionService } from '@/executions/execution.service';

import { PerformanceMonitoringService } from '../performance-monitoring.service';

// Mock logger
jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	LoggerProxy: {
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('PerformanceMonitoringService', () => {
	let service: PerformanceMonitoringService;
	let executionService: jest.Mocked<ExecutionService>;
	let activeExecutions: jest.Mocked<ActiveExecutions>;

	const mockExecution = {
		id: 'exec-123',
		workflowId: 'workflow-456',
		status: 'success',
		startedAt: new Date('2024-01-01T10:00:00.000Z'),
		finishedAt: new Date('2024-01-01T10:05:00.000Z'),
		data: {
			resultData: {
				runData: {
					'node-1': [
						{
							startTime: 1704105600000, // 2024-01-01T10:00:00.000Z
							executionTime: 150000, // 2.5 minutes
							data: {
								main: [[{ json: { test: 'data' } }]],
							},
							node: {
								type: 'n8n-nodes-base.httpRequest',
							},
						},
					],
					'node-2': [
						{
							startTime: 1704105750000, // 2024-01-01T10:02:30.000Z
							executionTime: 45000, // 45 seconds
							data: {
								main: [[{ json: { result: 'processed' } }]],
							},
							node: {
								type: 'n8n-nodes-base.set',
							},
						},
					],
				},
			},
		} as IRunExecutionData,
	};

	const mockRunData: IRunData = {
		'node-1': [
			{
				startTime: 1704105600000,
				executionTime: 150000,
				data: {
					main: [[{ json: { test: 'data' } }]],
				},
				node: {
					type: 'n8n-nodes-base.httpRequest',
				},
			},
		],
		'node-2': [
			{
				startTime: 1704105750000,
				executionTime: 45000,
				data: {
					main: [[{ json: { result: 'processed' } }]],
				},
				node: {
					type: 'n8n-nodes-base.set',
				},
			},
		],
	};

	beforeEach(() => {
		executionService = {
			findOne: jest.fn(),
			findMany: jest.fn(),
		} as any;

		activeExecutions = {
			has: jest.fn(),
		} as any;

		service = new PerformanceMonitoringService(executionService, activeExecutions);
	});

	describe('getExecutionProfile', () => {
		it('should generate execution profile with all options enabled', async () => {
			executionService.findOne.mockResolvedValue(mockExecution);
			activeExecutions.has.mockReturnValue(false);

			const result = await service.getExecutionProfile('exec-123', {
				includeBottlenecks: true,
				includeResourceMetrics: true,
			});

			expect(result).toEqual({
				executionId: 'exec-123',
				workflowId: 'workflow-456',
				status: ExecutionStatus.SUCCESS,
				timing: {
					startedAt: '2024-01-01T10:00:00.000Z',
					finishedAt: '2024-01-01T10:05:00.000Z',
					duration: 300000, // 5 minutes
					queueTime: undefined,
				},
				performance: {
					nodeExecutions: [
						{
							nodeId: 'node-1',
							nodeType: 'n8n-nodes-base.httpRequest',
							duration: 150000,
							memoryUsage: expect.any(Number),
							inputItems: 1,
							outputItems: 1,
							status: NodeExecutionStatus.SUCCESS,
						},
						{
							nodeId: 'node-2',
							nodeType: 'n8n-nodes-base.set',
							duration: 45000,
							memoryUsage: expect.any(Number),
							inputItems: 1,
							outputItems: 1,
							status: NodeExecutionStatus.SUCCESS,
						},
					],
					totalMemoryPeak: expect.any(Number),
					resourceUtilization: {
						cpuPercent: expect.any(Number),
						memoryMB: expect.any(Number),
						ioOperations: expect.any(Number),
					},
				},
				bottlenecks: expect.any(Array),
			});

			expect(executionService.findOne).toHaveBeenCalledWith({
				where: { id: 'exec-123' },
				includeData: true,
			});
			expect(activeExecutions.has).toHaveBeenCalledWith('exec-123');
		});

		it('should generate minimal profile when options are disabled', async () => {
			executionService.findOne.mockResolvedValue(mockExecution);
			activeExecutions.has.mockReturnValue(false);

			const result = await service.getExecutionProfile('exec-123', {
				includeBottlenecks: false,
				includeResourceMetrics: false,
			});

			expect(result.performance.totalMemoryPeak).toBeUndefined();
			expect(result.performance.resourceUtilization.cpuPercent).toBeUndefined();
			expect(result.performance.resourceUtilization.memoryMB).toBeUndefined();
			expect(result.performance.resourceUtilization.ioOperations).toBeUndefined();
			expect(result.bottlenecks).toEqual([]);
		});

		it('should handle execution with error status', async () => {
			const errorExecution = {
				...mockExecution,
				status: 'error',
				data: {
					resultData: {
						runData: {
							'node-1': [
								{
									...mockRunData['node-1'][0],
									error: new Error('Node execution failed'),
								},
							],
						},
					},
				},
			};

			executionService.findOne.mockResolvedValue(errorExecution);
			activeExecutions.has.mockReturnValue(false);

			const result = await service.getExecutionProfile('exec-123');

			expect(result.status).toBe(ExecutionStatus.ERROR);
			expect(result.performance.nodeExecutions[0].status).toBe(NodeExecutionStatus.ERROR);
		});

		it('should throw ApplicationError when execution not found', async () => {
			executionService.findOne.mockResolvedValue(null);

			await expect(service.getExecutionProfile('nonexistent')).rejects.toThrow(ApplicationError);
			await expect(service.getExecutionProfile('nonexistent')).rejects.toThrow(
				'Execution not found',
			);
		});

		it('should handle execution without finished timestamp', async () => {
			const runningExecution = {
				...mockExecution,
				status: 'running',
				finishedAt: null,
			};

			executionService.findOne.mockResolvedValue(runningExecution);
			activeExecutions.has.mockReturnValue(true);

			const result = await service.getExecutionProfile('exec-123');

			expect(result.status).toBe(ExecutionStatus.RUNNING);
			expect(result.timing.finishedAt).toBeUndefined();
			expect(result.timing.duration).toBeUndefined();
		});

		it('should detect bottlenecks for slow execution', async () => {
			const slowExecution = {
				...mockExecution,
				data: {
					resultData: {
						runData: {
							'slow-node': [
								{
									startTime: 1704105600000,
									executionTime: 35000, // 35 seconds (> 30 second threshold)
									data: {
										main: [[{ json: { data: 'x'.repeat(1000000) } }]], // Large data
									},
									node: {
										type: 'n8n-nodes-base.httpRequest',
									},
								},
							],
						},
					},
				} as IRunExecutionData,
			};

			executionService.findOne.mockResolvedValue(slowExecution);
			activeExecutions.has.mockReturnValue(false);

			const result = await service.getExecutionProfile('exec-123', {
				includeBottlenecks: true,
			});

			expect(result.bottlenecks).toHaveLength(1);
			expect(result.bottlenecks[0]).toEqual({
				nodeId: 'slow-node',
				issue: BottleneckIssue.SLOW_EXECUTION,
				severity: BottleneckSeverity.MEDIUM,
				suggestion: expect.stringContaining('Node execution took 35s'),
			});
		});

		it('should detect multiple bottleneck types', async () => {
			const problematicExecution = {
				...mockExecution,
				data: {
					resultData: {
						runData: {
							'problematic-node': [
								{
									startTime: 1704105600000,
									executionTime: 125000, // >120 seconds = HIGH severity
									data: {
										main: [[{ json: { data: 'x'.repeat(15000000) } }]], // >10MB data
									},
									node: {
										type: 'n8n-nodes-base.httpRequest',
									},
								},
							],
						},
					},
				} as IRunExecutionData,
			};

			executionService.findOne.mockResolvedValue(problematicExecution);

			const result = await service.getExecutionProfile('exec-123', {
				includeBottlenecks: true,
				includeResourceMetrics: true,
			});

			expect(result.bottlenecks.length).toBeGreaterThan(1);

			const slowExecutionBottleneck = result.bottlenecks.find(
				(b) => b.issue === BottleneckIssue.SLOW_EXECUTION,
			);
			expect(slowExecutionBottleneck?.severity).toBe(BottleneckSeverity.HIGH);

			const largeDataBottleneck = result.bottlenecks.find(
				(b) => b.issue === BottleneckIssue.LARGE_DATASET,
			);
			expect(largeDataBottleneck?.severity).toBe(BottleneckSeverity.MEDIUM);
		});
	});

	describe('getPerformanceMetrics', () => {
		const mockExecutions = [
			{
				id: 'exec-1',
				workflowId: 'workflow-1',
				status: 'success',
				startedAt: new Date('2024-01-01T10:00:00.000Z'),
				finishedAt: new Date('2024-01-01T10:02:00.000Z'),
			},
			{
				id: 'exec-2',
				workflowId: 'workflow-1',
				status: 'error',
				startedAt: new Date('2024-01-01T11:00:00.000Z'),
				finishedAt: new Date('2024-01-01T11:01:30.000Z'),
			},
			{
				id: 'exec-3',
				workflowId: 'workflow-1',
				status: 'running',
				startedAt: new Date('2024-01-01T12:00:00.000Z'),
				finishedAt: null,
			},
		];

		it('should calculate performance metrics for time range', async () => {
			executionService.findMany.mockResolvedValue(mockExecutions);

			const request = {
				timeRange: '24h',
				workflowId: 'workflow-1',
			};

			const result = await service.getPerformanceMetrics(request);

			expect(result.timeRange.start).toBeDefined();
			expect(result.timeRange.end).toBeDefined();
			expect(result.filters.workflowId).toBe('workflow-1');

			expect(result.metrics.executionCounts).toEqual({
				total: 3,
				success: 1,
				failed: 1,
				running: 1,
			});

			expect(result.metrics.timing.averageDuration).toBe(105000); // Average of 120s and 90s
			expect(result.metrics.trends).toBeDefined();
			expect(Array.isArray(result.metrics.trends)).toBe(true);
		});

		it('should handle custom date range', async () => {
			executionService.findMany.mockResolvedValue(mockExecutions);

			const request = {
				startDate: '2024-01-01T00:00:00.000Z',
				endDate: '2024-01-02T00:00:00.000Z',
			};

			const result = await service.getPerformanceMetrics(request);

			expect(result.timeRange.start).toBe('2024-01-01T00:00:00.000Z');
			expect(result.timeRange.end).toBe('2024-01-02T00:00:00.000Z');
		});

		it('should handle status filter', async () => {
			executionService.findMany.mockResolvedValue(mockExecutions);

			const request = {
				timeRange: '24h',
				status: 'success,error',
			};

			await service.getPerformanceMetrics(request);

			expect(executionService.findMany).toHaveBeenCalledWith({
				where: {
					status: ['success', 'error'],
					startedAt: {
						gte: expect.any(Date),
						lte: expect.any(Date),
					},
				},
				select: {
					id: true,
					workflowId: true,
					status: true,
					startedAt: true,
					finishedAt: true,
				},
			});
		});

		it('should default to 24h time range when not specified', async () => {
			executionService.findMany.mockResolvedValue([]);

			const request = {};

			const result = await service.getPerformanceMetrics(request);

			const startTime = new Date(result.timeRange.start);
			const endTime = new Date(result.timeRange.end);
			const diff = endTime.getTime() - startTime.getTime();

			expect(diff).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
		});

		it('should calculate percentile durations correctly', async () => {
			const manyExecutions = Array.from({ length: 100 }, (_, i) => ({
				id: `exec-${i}`,
				workflowId: 'workflow-1',
				status: 'success',
				startedAt: new Date('2024-01-01T10:00:00.000Z'),
				finishedAt: new Date(new Date('2024-01-01T10:00:00.000Z').getTime() + (i + 1) * 1000),
			}));

			executionService.findMany.mockResolvedValue(manyExecutions);

			const result = await service.getPerformanceMetrics({ timeRange: '24h' });

			expect(result.metrics.timing.medianDuration).toBe(50000); // 50th execution = 50 seconds
			expect(result.metrics.timing.p95Duration).toBe(95000); // 95th execution = 95 seconds
			expect(result.metrics.timing.p99Duration).toBe(99000); // 99th execution = 99 seconds
		});

		it('should generate trend data with appropriate intervals', async () => {
			const trendExecutions = [
				{
					id: 'exec-1',
					workflowId: 'workflow-1',
					status: 'success',
					startedAt: new Date('2024-01-01T10:00:00.000Z'),
					finishedAt: new Date('2024-01-01T10:01:00.000Z'),
				},
				{
					id: 'exec-2',
					workflowId: 'workflow-1',
					status: 'error',
					startedAt: new Date('2024-01-01T10:05:00.000Z'),
					finishedAt: new Date('2024-01-01T10:06:00.000Z'),
				},
				{
					id: 'exec-3',
					workflowId: 'workflow-1',
					status: 'success',
					startedAt: new Date('2024-01-01T11:00:00.000Z'),
					finishedAt: new Date('2024-01-01T11:02:00.000Z'),
				},
			];

			executionService.findMany.mockResolvedValue(trendExecutions);

			const result = await service.getPerformanceMetrics({ timeRange: '24h' });

			expect(result.metrics.trends.length).toBeGreaterThan(0);

			const firstTrend = result.metrics.trends[0];
			expect(firstTrend).toHaveProperty('timestamp');
			expect(firstTrend).toHaveProperty('executionCount');
			expect(firstTrend).toHaveProperty('averageDuration');
			expect(firstTrend).toHaveProperty('errorRate');

			expect(typeof firstTrend.errorRate).toBe('number');
			expect(firstTrend.errorRate).toBeGreaterThanOrEqual(0);
			expect(firstTrend.errorRate).toBeLessThanOrEqual(100);
		});
	});

	describe('mapExecutionStatus', () => {
		it('should map all execution status values correctly', () => {
			// Access private method for testing
			const serviceAny = service as any;

			expect(serviceAny.mapExecutionStatus('new')).toBe(ExecutionStatus.NEW);
			expect(serviceAny.mapExecutionStatus('running')).toBe(ExecutionStatus.RUNNING);
			expect(serviceAny.mapExecutionStatus('success')).toBe(ExecutionStatus.SUCCESS);
			expect(serviceAny.mapExecutionStatus('error')).toBe(ExecutionStatus.ERROR);
			expect(serviceAny.mapExecutionStatus('canceled')).toBe(ExecutionStatus.CANCELED);
			expect(serviceAny.mapExecutionStatus('crashed')).toBe(ExecutionStatus.CRASHED);
			expect(serviceAny.mapExecutionStatus('waiting')).toBe(ExecutionStatus.WAITING);
			expect(serviceAny.mapExecutionStatus('unknown')).toBe(ExecutionStatus.ERROR);
		});
	});

	describe('parseTimeRange', () => {
		it('should parse different time range formats', () => {
			const serviceAny = service as any;

			const result1h = serviceAny.parseTimeRange({ timeRange: '1h' });
			expect(result1h.endDate.getTime() - result1h.startDate.getTime()).toBe(60 * 60 * 1000);

			const result24h = serviceAny.parseTimeRange({ timeRange: '24h' });
			expect(result24h.endDate.getTime() - result24h.startDate.getTime()).toBe(24 * 60 * 60 * 1000);

			const result7d = serviceAny.parseTimeRange({ timeRange: '7d' });
			expect(result7d.endDate.getTime() - result7d.startDate.getTime()).toBe(
				7 * 24 * 60 * 60 * 1000,
			);

			const result30d = serviceAny.parseTimeRange({ timeRange: '30d' });
			expect(result30d.endDate.getTime() - result30d.startDate.getTime()).toBe(
				30 * 24 * 60 * 60 * 1000,
			);
		});

		it('should use custom date range when provided', () => {
			const serviceAny = service as any;

			const startDate = '2024-01-01T00:00:00.000Z';
			const endDate = '2024-01-02T00:00:00.000Z';

			const result = serviceAny.parseTimeRange({ startDate, endDate });

			expect(result.startDate.toISOString()).toBe(startDate);
			expect(result.endDate.toISOString()).toBe(endDate);
		});

		it('should default to 24h when no time range specified', () => {
			const serviceAny = service as any;

			const result = serviceAny.parseTimeRange({});

			expect(result.endDate.getTime() - result.startDate.getTime()).toBe(24 * 60 * 60 * 1000);
			expect(result.timeRange).toBe('24h');
		});
	});
});
