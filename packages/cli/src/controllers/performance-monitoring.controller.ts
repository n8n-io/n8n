import {
	ExecutionProfileDto,
	ExecutionProfileRequestDto,
	SystemResourcesDto,
	SystemResourcesRequestDto,
	PerformanceMetricsDto,
	PerformanceMetricsRequestDto,
} from '@n8n/api-types';
import { Response } from 'express';
// Future import for DI container
// import { Container } from '@n8n/di';
import type { AuthenticatedRequest } from '@n8n/db';
import { LoggerProxy } from 'n8n-workflow';

import { PerformanceMonitoringService } from '@/services/performance-monitoring.service';
import { SystemResourcesService } from '@/services/system-resources.service';

import { Get, RestController, Param, Query } from '@n8n/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

@RestController('/performance-monitoring')
export class PerformanceMonitoringController {
	private readonly logger = LoggerProxy;

	constructor(
		private readonly performanceService: PerformanceMonitoringService,
		private readonly systemResourcesService: SystemResourcesService,
		// TODO: Fix InternalHooks import path
		// private readonly internalHooks: InternalHooks,
	) {}

	/**
	 * GET /performance-monitoring/executions/:id/profile
	 * Get detailed execution profile with performance metrics and bottleneck analysis
	 */
	@Get('/executions/:id/profile')
	async getExecutionProfile(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') executionId: string,
		@Query query: ExecutionProfileRequestDto,
	): Promise<ExecutionProfileDto> {
		try {
			// Validate execution ID format
			if (!executionId || executionId.trim() === '') {
				throw new BadRequestError('Execution ID is required');
			}

			// Parse query options
			const options = {
				includeBottlenecks: this.parseBoolean(query.includeBottlenecks, true),
				includeResourceMetrics: this.parseBoolean(query.includeResourceMetrics, true),
			};

			this.logger.debug('Getting execution profile', {
				executionId,
				options,
				userId: req.user.id,
			});

			// Get execution profile
			const profile = await this.performanceService.getExecutionProfile(executionId, options);

			// Track usage for analytics
			// TODO: Fix InternalHooks import and re-enable tracking
			// void this.internalHooks.onUserAccessedPerformanceProfile({
			//	userId: req.user.id,
			//	executionId,
			//	workflowId: profile.workflowId,
			//	includeBottlenecks: options.includeBottlenecks,
			//	includeResourceMetrics: options.includeResourceMetrics,
			// });

			return profile;
		} catch (error) {
			if (error.name === 'ApplicationError' && error.message.includes('not found')) {
				throw new NotFoundError(`Execution with ID '${executionId}' not found`);
			}

			this.logger.error('Failed to get execution profile', {
				executionId,
				userId: req.user.id,
				error: error.message,
			});

			throw error;
		}
	}

	/**
	 * GET /performance-monitoring/system/resources
	 * Get current system resource utilization
	 */
	@Get('/system/resources')
	async getSystemResources(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: SystemResourcesRequestDto,
	): Promise<SystemResourcesDto> {
		try {
			// Parse query options
			const options = {
				includeWorkers: this.parseBoolean(query.includeWorkers, false),
				includeQueue: this.parseBoolean(query.includeQueue, false),
			};

			this.logger.debug('Getting system resources', {
				options,
				userId: req.user.id,
			});

			// Get system resources
			const resources = await this.systemResourcesService.getCurrentResources(options);

			// Track usage for analytics
			// TODO: Fix InternalHooks import and re-enable tracking
			// void this.internalHooks.onUserAccessedSystemResources({
			//	userId: req.user.id,
			//	includeWorkers: options.includeWorkers,
			//	includeQueue: options.includeQueue,
			// });

			return resources;
		} catch (error) {
			this.logger.error('Failed to get system resources', {
				userId: req.user.id,
				error: error.message,
			});

			throw error;
		}
	}

	/**
	 * GET /performance-monitoring/metrics/performance
	 * Get aggregated performance metrics over time
	 */
	@Get('/metrics/performance')
	async getPerformanceMetrics(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: PerformanceMetricsRequestDto,
	): Promise<PerformanceMetricsDto> {
		try {
			// Validate time range parameters
			if (query.startDate && query.endDate) {
				const startDate = new Date(query.startDate);
				const endDate = new Date(query.endDate);

				if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
					throw new BadRequestError('Invalid date format in startDate or endDate');
				}

				if (startDate >= endDate) {
					throw new BadRequestError('startDate must be before endDate');
				}

				// Limit time range to prevent excessive data retrieval
				const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
				if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
					throw new BadRequestError('Time range cannot exceed 90 days');
				}
			}

			// Validate status filter
			if (query.status) {
				const validStatuses = [
					'new',
					'running',
					'success',
					'error',
					'canceled',
					'crashed',
					'waiting',
				];
				const statusList = query.status.split(',');
				const invalidStatuses = statusList.filter(
					(status) => !validStatuses.includes(status.trim()),
				);

				if (invalidStatuses.length > 0) {
					throw new BadRequestError(`Invalid status values: ${invalidStatuses.join(', ')}`);
				}
			}

			this.logger.debug('Getting performance metrics', {
				query,
				userId: req.user.id,
			});

			// Get performance metrics
			const metrics = await this.performanceService.getPerformanceMetrics(query);

			// Track usage for analytics
			// TODO: Fix InternalHooks import and re-enable tracking
			// void this.internalHooks.onUserAccessedPerformanceMetrics({
			//	userId: req.user.id,
			//	timeRange: query.timeRange,
			//	workflowId: query.workflowId,
			//	hasCustomDateRange: !!(query.startDate && query.endDate),
			//	statusFilter: query.status,
			// });

			return metrics;
		} catch (error) {
			this.logger.error('Failed to get performance metrics', {
				query,
				userId: req.user.id,
				error: error.message,
			});

			throw error;
		}
	}

	/**
	 * GET /performance-monitoring/system/health
	 * Get system health status and recommendations
	 */
	@Get('/system/health')
	async getSystemHealth(req: AuthenticatedRequest, res: Response) {
		try {
			this.logger.debug('Getting system health', {
				userId: req.user.id,
			});

			// Get system health check
			const health = await this.systemResourcesService.checkSystemHealth();

			// Track usage for analytics
			// TODO: Fix InternalHooks import and re-enable tracking
			// void this.internalHooks.onUserAccessedSystemHealth({
			//	userId: req.user.id,
			//	healthy: health.healthy,
			//	issueCount: health.issues.length,
			// });

			return health;
		} catch (error) {
			this.logger.error('Failed to get system health', {
				userId: req.user.id,
				error: error.message,
			});

			throw error;
		}
	}

	/**
	 * GET /performance-monitoring/executions/:id/bottlenecks
	 * Get only bottleneck analysis for an execution (lightweight endpoint)
	 */
	@Get('/executions/:id/bottlenecks')
	async getExecutionBottlenecks(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') executionId: string,
	) {
		try {
			// Validate execution ID format
			if (!executionId || executionId.trim() === '') {
				throw new BadRequestError('Execution ID is required');
			}

			this.logger.debug('Getting execution bottlenecks', {
				executionId,
				userId: req.user.id,
			});

			// Get only bottlenecks (faster than full profile)
			const profile = await this.performanceService.getExecutionProfile(executionId, {
				includeBottlenecks: true,
				includeResourceMetrics: false,
			});

			// Return only bottlenecks data
			const result = {
				executionId: profile.executionId,
				workflowId: profile.workflowId,
				bottlenecks: profile.bottlenecks,
				timestamp: new Date().toISOString(),
			};

			// Track usage for analytics
			// TODO: Fix InternalHooks import and re-enable tracking
			// void this.internalHooks.onUserAccessedExecutionBottlenecks({
			//	userId: req.user.id,
			//	executionId,
			//	workflowId: profile.workflowId,
			//	bottleneckCount: profile.bottlenecks.length,
			// });

			return result;
		} catch (error) {
			if (error.name === 'ApplicationError' && error.message.includes('not found')) {
				throw new NotFoundError(`Execution with ID '${executionId}' not found`);
			}

			this.logger.error('Failed to get execution bottlenecks', {
				executionId,
				userId: req.user.id,
				error: error.message,
			});

			throw error;
		}
	}

	/**
	 * Parse boolean query parameter with default value
	 */
	private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
		if (value === undefined) return defaultValue;
		return value.toLowerCase() === 'true';
	}
}
