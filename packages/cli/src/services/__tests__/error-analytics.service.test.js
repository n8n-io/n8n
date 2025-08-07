'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const error_analytics_service_1 = require('../error-analytics.service');
describe('ErrorAnalyticsService', () => {
	let service;
	let mockLogger;
	let mockExecutionRepository;
	let mockWorkflowRepository;
	let mockCacheService;
	beforeEach(() => {
		mockLogger = (0, jest_mock_extended_1.mock)();
		mockExecutionRepository = (0, jest_mock_extended_1.mock)();
		mockWorkflowRepository = (0, jest_mock_extended_1.mock)();
		mockCacheService = (0, jest_mock_extended_1.mock)();
		service = new error_analytics_service_1.ErrorAnalyticsService(
			mockLogger,
			mockExecutionRepository,
			mockWorkflowRepository,
			mockCacheService,
		);
	});
	describe('getNodeErrorInsights', () => {
		it('should return comprehensive error insights', async () => {
			const query = {
				startDate: '2024-01-01T00:00:00.000Z',
				endDate: '2024-01-31T23:59:59.999Z',
				groupBy: 'day',
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorInsights(query);
			expect(result).toBeDefined();
			expect(result.nodeTypeStats).toBeInstanceOf(Array);
			expect(result.totalErrors).toBeGreaterThanOrEqual(0);
			expect(result.totalExecutions).toBeGreaterThanOrEqual(0);
			expect(result.overallErrorRate).toBeGreaterThanOrEqual(0);
			expect(result.trendData).toBeInstanceOf(Array);
			expect(result.recommendations).toBeInstanceOf(Array);
			expect(result.timeRange).toBeDefined();
			expect(result.timeRange.startDate).toBe(query.startDate);
			expect(result.timeRange.endDate).toBe(query.endDate);
			expect(mockCacheService.get).toHaveBeenCalledWith(
				expect.stringContaining('node-error-insights:'),
			);
			expect(mockCacheService.set).toHaveBeenCalledWith(
				expect.stringContaining('node-error-insights:'),
				result,
				900,
			);
		});
		it('should return cached data when available', async () => {
			const query = { groupBy: 'day' };
			const cachedData = {
				nodeTypeStats: [],
				totalErrors: 0,
				totalExecutions: 0,
				overallErrorRate: 0,
				trendData: [],
				recommendations: [],
				timeRange: {
					startDate: '2024-01-01T00:00:00.000Z',
					endDate: '2024-01-31T23:59:59.999Z',
				},
			};
			mockCacheService.get.mockResolvedValue(cachedData);
			const result = await service.getNodeErrorInsights(query);
			expect(result).toBe(cachedData);
			expect(mockCacheService.set).not.toHaveBeenCalled();
		});
		it('should filter by node type when specified', async () => {
			const query = {
				nodeType: 'HTTP Request',
				groupBy: 'day',
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorInsights(query);
			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching error data by node type',
				expect.objectContaining({
					nodeType: 'HTTP Request',
				}),
			);
		});
		it('should filter by workflow ID when specified', async () => {
			const query = {
				workflowId: 'wf-123',
				groupBy: 'day',
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorInsights(query);
			expect(result).toBeDefined();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Fetching error data by node type',
				expect.objectContaining({
					workflowId: 'wf-123',
				}),
			);
		});
		it('should generate high-priority recommendations for nodes with high error rates', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorInsights(query);
			expect(result.recommendations).toBeInstanceOf(Array);
			const highPriorityRecs = result.recommendations.filter((rec) => rec.priority === 'high');
			if (highPriorityRecs.length > 0) {
				expect(highPriorityRecs[0]).toMatchObject({
					nodeType: expect.any(String),
					issue: expect.any(String),
					suggestion: expect.any(String),
					priority: 'high',
					potentialImpact: expect.any(String),
				});
			}
		});
	});
	describe('getNodeErrorBreakdown', () => {
		it('should return detailed error breakdown for a specific node type', async () => {
			const nodeType = 'HTTP Request';
			const timeRange = {
				start: new Date('2024-01-01T00:00:00.000Z'),
				end: new Date('2024-01-31T23:59:59.999Z'),
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorBreakdown(nodeType, timeRange);
			expect(result).toBeDefined();
			expect(result.nodeType).toBe('HTTP Request');
			expect(result.errors).toBeInstanceOf(Array);
			expect(result.totalErrors).toBeGreaterThanOrEqual(0);
			expect(result.timeRange).toBeDefined();
			if (result.errors.length > 0) {
				const error = result.errors[0];
				expect(error).toMatchObject({
					errorType: expect.any(String),
					count: expect.any(Number),
					percentage: expect.any(Number),
					firstSeen: expect.any(String),
					lastSeen: expect.any(String),
					sampleMessage: expect.any(String),
					affectedWorkflows: expect.any(Number),
				});
			}
		});
		it('should respect the error limit in breakdown', async () => {
			const nodeType = 'HTTP Request';
			const timeRange = {
				start: new Date('2024-01-01T00:00:00.000Z'),
				end: new Date('2024-01-31T23:59:59.999Z'),
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorBreakdown(nodeType, timeRange);
			expect(result.errors).toBeInstanceOf(Array);
		});
		it('should return cached breakdown when available', async () => {
			const nodeType = 'HTTP Request';
			const timeRange = {
				start: new Date('2024-01-01T00:00:00.000Z'),
				end: new Date('2024-01-31T23:59:59.999Z'),
			};
			const cachedData = {
				nodeType: 'HTTP Request',
				errors: [],
				totalErrors: 0,
				timeRange: {
					startDate: '2024-01-01T00:00:00.000Z',
					endDate: '2024-01-31T23:59:59.999Z',
				},
			};
			mockCacheService.get.mockResolvedValue(cachedData);
			const result = await service.getNodeErrorBreakdown(nodeType, timeRange);
			expect(result).toBe(cachedData);
			expect(mockCacheService.set).not.toHaveBeenCalled();
		});
	});
	describe('getSystemHealthMetrics', () => {
		it('should return comprehensive system health metrics', async () => {
			const query = {
				startDate: '2024-01-01T00:00:00.000Z',
				endDate: '2024-01-31T23:59:59.999Z',
				groupBy: 'day',
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getSystemHealthMetrics(query);
			expect(result).toBeDefined();
			expect(result.overall).toMatchObject({
				totalExecutions: expect.any(Number),
				totalErrors: expect.any(Number),
				errorRate: expect.any(Number),
				avgExecutionTime: expect.any(Number),
			});
			expect(result.byPeriod).toBeInstanceOf(Array);
			expect(result.topFailingNodes).toBeInstanceOf(Array);
			expect(result.alerts).toBeInstanceOf(Array);
			expect(result.overall.totalExecutions).toBeGreaterThanOrEqual(result.overall.totalErrors);
			expect(result.overall.errorRate).toBeGreaterThanOrEqual(0);
			expect(result.overall.errorRate).toBeLessThanOrEqual(100);
		});
		it('should include period data with proper structure', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getSystemHealthMetrics(query);
			if (result.byPeriod.length > 0) {
				const period = result.byPeriod[0];
				expect(period).toMatchObject({
					period: expect.any(String),
					executions: expect.any(Number),
					errors: expect.any(Number),
					errorRate: expect.any(Number),
					avgExecutionTime: expect.any(Number),
				});
			}
		});
		it('should include top failing nodes with impact assessment', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getSystemHealthMetrics(query);
			if (result.topFailingNodes.length > 0) {
				const failingNode = result.topFailingNodes[0];
				expect(failingNode).toMatchObject({
					nodeType: expect.any(String),
					errorCount: expect.any(Number),
					errorRate: expect.any(Number),
					impact: expect.stringMatching(/^(low|medium|high)$/),
				});
			}
		});
		it('should generate alerts for critical issues', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getSystemHealthMetrics(query);
			result.alerts.forEach((alert) => {
				expect(alert).toMatchObject({
					type: expect.stringMatching(/^(error_spike|performance_degradation|failure_pattern)$/),
					severity: expect.stringMatching(/^(info|warning|critical)$/),
					message: expect.any(String),
					detectedAt: expect.any(String),
					affectedExecutions: expect.any(Number),
				});
				if (alert.nodeType !== null) {
					expect(alert.nodeType).toEqual(expect.any(String));
				}
			});
		});
		it('should use default date range when dates not provided', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getSystemHealthMetrics(query);
			expect(result).toBeDefined();
			expect(result.overall.totalExecutions).toBeGreaterThanOrEqual(0);
		});
	});
	describe('error handling', () => {
		it('should handle cache service failures by throwing errors', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockRejectedValue(new Error('Cache failure'));
			mockCacheService.set.mockResolvedValue();
			await expect(service.getNodeErrorInsights(query)).rejects.toThrow('Cache failure');
		});
		it('should handle cache set failures by still returning data', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockRejectedValue(new Error('Cache set failure'));
			await expect(service.getNodeErrorInsights(query)).rejects.toThrow('Cache set failure');
		});
	});
	describe('date range handling', () => {
		it('should handle various date formats correctly', async () => {
			const query = {
				startDate: '2024-01-01',
				endDate: '2024-01-31',
				groupBy: 'day',
			};
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorInsights(query);
			expect(result.timeRange.startDate).toContain('2024-01-01');
			expect(result.timeRange.endDate).toContain('2024-01-31');
		});
		it('should use default date range when not provided', async () => {
			const query = { groupBy: 'day' };
			mockCacheService.get.mockResolvedValue(null);
			mockCacheService.set.mockResolvedValue();
			const result = await service.getNodeErrorInsights(query);
			expect(result.timeRange.startDate).toBeDefined();
			expect(result.timeRange.endDate).toBeDefined();
			const startDate = new Date(result.timeRange.startDate);
			const endDate = new Date(result.timeRange.endDate);
			expect(startDate).toBeInstanceOf(Date);
			expect(endDate).toBeInstanceOf(Date);
			expect(startDate.getTime()).toBeLessThan(endDate.getTime());
		});
	});
});
//# sourceMappingURL=error-analytics.service.test.js.map
