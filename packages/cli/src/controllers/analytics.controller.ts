import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Query, RestController } from '@n8n/decorators';
import { Logger } from '@n8n/backend-common';
import type { Response } from 'express';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AnalyticsService } from '@/services/analytics.service';
import { ErrorAnalyticsService } from '@/services/error-analytics.service';
import type {
	NodeErrorBreakdownQueryDto,
	NodeErrorBreakdownResponseDto,
	NodeTypeAnalyticsQueryDto,
	NodeTypeAnalyticsResponseDto,
	SystemAnalyticsQueryDto,
	SystemAnalyticsResponseDto,
	NodeTypesListResponseDto,
	NodeComparisonQueryDto,
	NodeComparisonResponseDto,
	ErrorPatternsQueryDto,
	ErrorPatternsResponseDto,
	PerformanceCorrelationQueryDto,
	PerformanceCorrelationResponseDto,
} from './analytics.dto';

@RestController('/analytics')
export class AnalyticsController {
	constructor(
		private readonly logger: Logger,
		private readonly analyticsService: AnalyticsService,
		private readonly errorAnalyticsService: ErrorAnalyticsService,
	) {}

	/**
	 * Get system-wide analytics overview
	 */
	@Get('/system')
	async getSystemAnalytics(
		req: AuthenticatedRequest,
		_res: Response,
		@Query queryDto: SystemAnalyticsQueryDto,
	): Promise<SystemAnalyticsResponseDto> {
		this.logger.debug('System analytics requested', {
			userId: req.user.id,
			timeRange: queryDto.timeRange,
		});

		try {
			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const analytics = await this.analyticsService.getSystemAnalytics(timeRange);

			return {
				success: true,
				data: analytics,
				metadata: {
					requestedAt: new Date().toISOString(),
					timeRange: analytics.timeRange,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get system analytics', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError(
				`Failed to get system analytics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get detailed error breakdown for a specific node type
	 */
	@Get('/nodes/:nodeType/error-breakdown')
	async getNodeErrorBreakdown(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
		@Query queryDto: NodeErrorBreakdownQueryDto,
	): Promise<NodeErrorBreakdownResponseDto> {
		this.logger.debug('Node error breakdown requested', {
			userId: req.user.id,
			nodeType,
			timeRange: queryDto.timeRange,
		});

		try {
			if (!nodeType || nodeType.trim().length === 0) {
				throw new BadRequestError('Node type is required');
			}

			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const query = {
				nodeType,
				limit: 50, // Default limit
				startDate: timeRange.start.toISOString(),
				endDate: timeRange.end.toISOString(),
			};
			const breakdown = await this.errorAnalyticsService.getNodeErrorBreakdown(query);

			return {
				success: true,
				data: breakdown,
				metadata: {
					requestedAt: new Date().toISOString(),
					nodeType,
					timeRange,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get node error breakdown', {
				userId: req.user.id,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError(
				`Failed to get node error breakdown: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get analytics for a specific node type
	 */
	@Get('/nodes/:nodeType')
	async getNodeTypeAnalytics(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
		@Query queryDto: NodeTypeAnalyticsQueryDto,
	): Promise<NodeTypeAnalyticsResponseDto> {
		this.logger.debug('Node type analytics requested', {
			userId: req.user.id,
			nodeType,
			timeRange: queryDto.timeRange,
		});

		try {
			if (!nodeType || nodeType.trim().length === 0) {
				throw new BadRequestError('Node type is required');
			}

			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const analytics = await this.analyticsService.getNodeTypeAnalytics(nodeType, timeRange);

			return {
				success: true,
				data: analytics,
				metadata: {
					requestedAt: new Date().toISOString(),
					nodeType,
					timeRange,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get node type analytics', {
				userId: req.user.id,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError(
				`Failed to get node type analytics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get list of all available node types with basic statistics
	 */
	@Get('/nodes')
	async getAllNodeTypes(
		req: AuthenticatedRequest,
		_res: Response,
		@Query queryDto: NodeTypeAnalyticsQueryDto,
	): Promise<NodeTypesListResponseDto> {
		this.logger.debug('All node types requested', {
			userId: req.user.id,
			timeRange: queryDto.timeRange,
		});

		try {
			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const nodeTypes = await this.analyticsService.getAllNodeTypes(timeRange);

			return {
				success: true,
				data: nodeTypes,
				metadata: {
					requestedAt: new Date().toISOString(),
					timeRange,
					total: nodeTypes.length,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get all node types', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError(
				`Failed to get all node types: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Compare multiple node types
	 */
	@Get('/nodes/compare')
	async compareNodeTypes(
		req: AuthenticatedRequest,
		_res: Response,
		@Query queryDto: NodeComparisonQueryDto,
	): Promise<NodeComparisonResponseDto> {
		this.logger.debug('Node comparison requested', {
			userId: req.user.id,
			nodeTypes: queryDto.nodeTypes,
			timeRange: queryDto.timeRange,
		});

		try {
			if (!queryDto.nodeTypes || queryDto.nodeTypes.length === 0) {
				throw new BadRequestError('At least one node type is required for comparison');
			}

			if (queryDto.nodeTypes.length > 10) {
				throw new BadRequestError('Cannot compare more than 10 node types at once');
			}

			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const comparison = await this.analyticsService.compareNodeTypes(
				queryDto.nodeTypes,
				timeRange,
			);

			return {
				success: true,
				data: comparison,
				metadata: {
					requestedAt: new Date().toISOString(),
					nodeTypes: queryDto.nodeTypes,
					timeRange,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to compare node types', {
				userId: req.user.id,
				nodeTypes: queryDto.nodeTypes,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError(
				`Failed to compare node types: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Identify error patterns across node types
	 */
	@Get('/error-patterns')
	async getErrorPatterns(
		req: AuthenticatedRequest,
		_res: Response,
		@Query queryDto: ErrorPatternsQueryDto,
	): Promise<ErrorPatternsResponseDto> {
		this.logger.debug('Error patterns requested', {
			userId: req.user.id,
			nodeTypes: queryDto.nodeTypes,
			timeRange: queryDto.timeRange,
		});

		try {
			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const patterns = await this.errorAnalyticsService.identifyErrorPatterns(
				queryDto.nodeTypes,
				timeRange,
			);

			return {
				success: true,
				data: patterns,
				metadata: {
					requestedAt: new Date().toISOString(),
					nodeTypes: queryDto.nodeTypes,
					timeRange,
					totalPatterns: patterns.length,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get error patterns', {
				userId: req.user.id,
				nodeTypes: queryDto.nodeTypes,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError(
				`Failed to get error patterns: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Analyze performance correlation with error rates for a node type
	 */
	@Get('/nodes/:nodeType/performance-correlation')
	async getPerformanceCorrelation(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('nodeType') nodeType: string,
		@Query queryDto: PerformanceCorrelationQueryDto,
	): Promise<PerformanceCorrelationResponseDto> {
		this.logger.debug('Performance correlation requested', {
			userId: req.user.id,
			nodeType,
			timeRange: queryDto.timeRange,
		});

		try {
			if (!nodeType || nodeType.trim().length === 0) {
				throw new BadRequestError('Node type is required');
			}

			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const correlation = await this.errorAnalyticsService.analyzePerformanceCorrelation(
				nodeType,
				timeRange,
			);

			return {
				success: true,
				data: correlation,
				metadata: {
					requestedAt: new Date().toISOString(),
					nodeType,
					timeRange,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get performance correlation', {
				userId: req.user.id,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError(
				`Failed to get performance correlation: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Helper method to parse time range from query parameters
	 */
	private parseTimeRange(timeRangeStr?: string): { start: Date; end: Date } {
		if (!timeRangeStr) {
			// Default to last 7 days
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 7);
			return { start, end };
		}

		try {
			// Expected format: "start_timestamp,end_timestamp" or "7d", "30d", "1h"
			if (timeRangeStr.includes(',')) {
				const [startStr, endStr] = timeRangeStr.split(',');
				const start = new Date(parseInt(startStr, 10));
				const end = new Date(parseInt(endStr, 10));

				if (isNaN(start.getTime()) || isNaN(end.getTime())) {
					throw new BadRequestError('Invalid timestamp format');
				}

				if (start >= end) {
					throw new BadRequestError('Start time must be before end time');
				}

				return { start, end };
			}

			// Handle relative time ranges
			const end = new Date();
			const start = new Date();

			if (timeRangeStr.endsWith('d')) {
				const days = parseInt(timeRangeStr.slice(0, -1), 10);
				if (isNaN(days) || days <= 0 || days > 365) {
					throw new BadRequestError('Invalid day range (1-365 days allowed)');
				}
				start.setDate(start.getDate() - days);
			} else if (timeRangeStr.endsWith('h')) {
				const hours = parseInt(timeRangeStr.slice(0, -1), 10);
				if (isNaN(hours) || hours <= 0 || hours > 24 * 30) {
					throw new BadRequestError('Invalid hour range (1-720 hours allowed)');
				}
				start.setHours(start.getHours() - hours);
			} else if (timeRangeStr.endsWith('m')) {
				const minutes = parseInt(timeRangeStr.slice(0, -1), 10);
				if (isNaN(minutes) || minutes <= 0 || minutes > 60 * 24 * 7) {
					throw new BadRequestError('Invalid minute range (1-10080 minutes allowed)');
				}
				start.setMinutes(start.getMinutes() - minutes);
			} else {
				throw new BadRequestError(
					'Invalid time range format. Use "7d", "24h", "60m" or "start_timestamp,end_timestamp"',
				);
			}

			return { start, end };
		} catch (error) {
			if (error instanceof BadRequestError) {
				throw error;
			}
			throw new BadRequestError('Failed to parse time range');
		}
	}
}
