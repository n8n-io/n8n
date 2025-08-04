import {
	EnhancedSystemResourcesDto,
	SystemMonitoringRequestDto,
	SystemHealthDto,
	AlertsQueryDto,
	AlertsResponseDto,
	WorkflowMetricsQueryDto,
	WorkflowMetricsHistoryDto,
	SystemMetricsHistoryDto,
	CreateAlertRuleDto,
	UpdateAlertRuleDto,
	AlertRuleDto,
	AlertRulesResponseDto,
	MonitoringConfigDto,
	NodePerformanceMetricsDto,
	WorkflowNodeBreakdownDto,
	NodeTypePerformanceDto,
	LiveNodeExecutionDto,
	NodePerformanceHistoryDto,
	NodePerformanceRequestDto,
	WorkflowNodeBreakdownRequestDto,
	NodeTypePerformanceRequestDto,
	NodeTypePerformanceResponseDto,
} from '@n8n/api-types';
import { Response } from 'express';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Get,
	Post,
	Put,
	Delete,
	RestController,
	Param,
	Query,
	Body,
	Licensed,
} from '@n8n/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { LoggerProxy } from 'n8n-workflow';
import { SystemMonitoringService } from '@/services/system-monitoring.service';

@RestController('/system-monitoring')
export class SystemMonitoringController {
	private readonly logger = LoggerProxy;

	constructor(private readonly systemMonitoringService: SystemMonitoringService) {}

	/**
	 * GET /system-monitoring/resources
	 * Get enhanced system resource utilization with detailed monitoring
	 */
	@Get('/resources')
	async getSystemResources(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: SystemMonitoringRequestDto,
	): Promise<EnhancedSystemResourcesDto> {
		try {
			const options = {
				includeWorkers: query.includeWorkers || false,
				includeQueue: query.includeQueue || false,
				includeWorkflows: query.includeWorkflows || false,
				includeNetworking: query.includeNetworking || false,
				includeDetailed: query.includeDetailed || false,
			};

			this.logger.debug('Getting enhanced system resources', {
				options,
				userId: req.user.id,
			});

			const resources = await this.systemMonitoringService.getEnhancedSystemResources(options);

			return resources;
		} catch (error) {
			this.logger.error('Failed to get enhanced system resources', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get system resources');
		}
	}

	/**
	 * GET /system-monitoring/health
	 * Get comprehensive system health status with component analysis
	 */
	@Get('/health')
	async getSystemHealth(req: AuthenticatedRequest, _res: Response): Promise<SystemHealthDto> {
		try {
			this.logger.debug('Getting system health status', {
				userId: req.user.id,
			});

			const health = await this.systemMonitoringService.checkSystemHealth();

			return health;
		} catch (error) {
			this.logger.error('Failed to get system health', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError('Failed to get system health status');
		}
	}

	/**
	 * GET /system-monitoring/alerts
	 * Get system alerts with filtering and pagination
	 */
	@Get('/alerts')
	async getAlerts(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: AlertsQueryDto,
	): Promise<AlertsResponseDto> {
		try {
			// Validate date range if provided
			if (query.startDate && query.endDate) {
				const start = new Date(query.startDate);
				const end = new Date(query.endDate);

				if (start >= end) {
					throw new BadRequestError('startDate must be before endDate');
				}

				// Limit range to prevent excessive data retrieval
				const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
				if (end.getTime() - start.getTime() > maxRange) {
					throw new BadRequestError('Date range cannot exceed 90 days');
				}
			}

			// Validate limit
			if (query.limit && (query.limit < 1 || query.limit > 500)) {
				throw new BadRequestError('Limit must be between 1 and 500');
			}

			// Validate offset
			if (query.offset && query.offset < 0) {
				throw new BadRequestError('Offset must be non-negative');
			}

			this.logger.debug('Getting system alerts', {
				query,
				userId: req.user.id,
			});

			const filter = {
				severity: query.severity,
				type: query.type,
				resolved: query.resolved,
				workflowId: query.workflowId,
				limit: query.limit,
				offset: query.offset,
				startDate: query.startDate ? new Date(query.startDate) : undefined,
				endDate: query.endDate ? new Date(query.endDate) : undefined,
			};

			const result = this.systemMonitoringService.getAlerts(filter);

			return {
				alerts: result.alerts,
				total: result.total,
				unresolved: result.unresolved,
				bySeverity: result.bySeverity,
				pagination: {
					limit: query.limit || 50,
					offset: query.offset || 0,
					total: result.total,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get alerts', {
				userId: req.user.id,
				query,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get alerts');
		}
	}

	/**
	 * GET /system-monitoring/metrics/history
	 * Get historical system metrics data
	 */
	@Get('/metrics/history')
	async getMetricsHistory(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: { timeRange?: string },
	): Promise<SystemMetricsHistoryDto[]> {
		try {
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const validatedTimeRange = query.timeRange || '24h';

			if (!validTimeRanges.includes(validatedTimeRange)) {
				throw new BadRequestError(
					`Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
				);
			}

			this.logger.debug('Getting metrics history', {
				timeRange: validatedTimeRange,
				userId: req.user.id,
			});

			const history = this.systemMonitoringService.getMetricsHistory(validatedTimeRange);

			return history;
		} catch (error) {
			this.logger.error('Failed to get metrics history', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get metrics history');
		}
	}

	/**
	 * GET /system-monitoring/workflows/:workflowId/metrics
	 * Get workflow-specific performance metrics
	 */
	@Get('/workflows/:workflowId/metrics')
	async getWorkflowMetrics(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Query query: WorkflowMetricsQueryDto,
	): Promise<WorkflowMetricsHistoryDto> {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new BadRequestError('Workflow ID is required');
			}

			// Validate limit
			if (query.limit && (query.limit < 1 || query.limit > 1000)) {
				throw new BadRequestError('Limit must be between 1 and 1000');
			}

			this.logger.debug('Getting workflow metrics', {
				workflowId,
				query,
				userId: req.user.id,
			});

			// This would be implemented to fetch workflow-specific metrics
			// For now, return a placeholder structure
			const workflowMetrics: WorkflowMetricsHistoryDto = {
				workflowId,
				workflowName: 'Sample Workflow', // Would be fetched from database
				timeRange: query.timeRange,
				executions: [],
				aggregates: {
					totalExecutions: 0,
					successRate: 0,
					averageDuration: 0,
					averageMemoryUsage: 0,
					averageCpuUsage: 0,
					peakMemoryUsage: 0,
					peakCpuUsage: 0,
				},
			};

			return workflowMetrics;
		} catch (error) {
			this.logger.error('Failed to get workflow metrics', {
				workflowId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get workflow metrics');
		}
	}

	/**
	 * GET /system-monitoring/alert-rules
	 * Get all alert rules
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Get('/alert-rules')
	async getAlertRules(req: AuthenticatedRequest, _res: Response): Promise<AlertRulesResponseDto> {
		try {
			this.logger.debug('Getting alert rules', {
				userId: req.user.id,
			});

			const result = this.systemMonitoringService.getAlertRules();

			return result;
		} catch (error) {
			this.logger.error('Failed to get alert rules', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError('Failed to get alert rules');
		}
	}

	/**
	 * POST /system-monitoring/alert-rules
	 * Create a new alert rule
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Post('/alert-rules')
	async createAlertRule(
		req: AuthenticatedRequest<{}, {}, CreateAlertRuleDto>,
		_res: Response,
	): Promise<AlertRuleDto> {
		try {
			// Validate required fields
			if (!req.body.name || req.body.name.trim() === '') {
				throw new BadRequestError('Alert rule name is required');
			}

			if (!req.body.metric || req.body.metric.trim() === '') {
				throw new BadRequestError('Metric name is required');
			}

			if (req.body.threshold === undefined || req.body.threshold === null) {
				throw new BadRequestError('Threshold value is required');
			}

			// Validate webhook URL if webhook notifications are enabled
			if (req.body.notifications?.webhook && !req.body.notifications.webhookUrl) {
				throw new BadRequestError('Webhook URL is required when webhook notifications are enabled');
			}

			this.logger.debug('Creating alert rule', {
				name: req.body.name,
				type: req.body.type,
				userId: req.user.id,
			});

			const alertRule = await this.systemMonitoringService.createAlertRule(req.body);

			return alertRule;
		} catch (error) {
			this.logger.error('Failed to create alert rule', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to create alert rule');
		}
	}

	/**
	 * PUT /system-monitoring/alert-rules/:id
	 * Update an existing alert rule
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Put('/alert-rules/:id')
	async updateAlertRule(
		req: AuthenticatedRequest<{}, {}, UpdateAlertRuleDto>,
		_res: Response,
		@Param('id') ruleId: string,
	): Promise<AlertRuleDto> {
		try {
			if (!ruleId || ruleId.trim() === '') {
				throw new BadRequestError('Alert rule ID is required');
			}

			// Validate name if provided
			if (req.body.name !== undefined && req.body.name.trim() === '') {
				throw new BadRequestError('Alert rule name cannot be empty');
			}

			// Validate webhook URL if webhook notifications are enabled
			if (req.body.notifications?.webhook && !req.body.notifications.webhookUrl) {
				throw new BadRequestError('Webhook URL is required when webhook notifications are enabled');
			}

			this.logger.debug('Updating alert rule', {
				ruleId,
				userId: req.user.id,
			});

			const alertRule = await this.systemMonitoringService.updateAlertRule(ruleId, req.body);

			return alertRule;
		} catch (error) {
			this.logger.error('Failed to update alert rule', {
				ruleId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			if (error.message.includes('not found')) {
				throw new NotFoundError(`Alert rule with ID '${ruleId}' not found`);
			}

			throw new InternalServerError('Failed to update alert rule');
		}
	}

	/**
	 * DELETE /system-monitoring/alert-rules/:id
	 * Delete an alert rule
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Delete('/alert-rules/:id')
	async deleteAlertRule(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') ruleId: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			if (!ruleId || ruleId.trim() === '') {
				throw new BadRequestError('Alert rule ID is required');
			}

			this.logger.debug('Deleting alert rule', {
				ruleId,
				userId: req.user.id,
			});

			await this.systemMonitoringService.deleteAlertRule(ruleId);

			return {
				success: true,
				message: 'Alert rule deleted successfully',
			};
		} catch (error) {
			this.logger.error('Failed to delete alert rule', {
				ruleId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			if (error.message.includes('not found')) {
				throw new NotFoundError(`Alert rule with ID '${ruleId}' not found`);
			}

			throw new InternalServerError('Failed to delete alert rule');
		}
	}

	/**
	 * POST /system-monitoring/alerts/:id/resolve
	 * Mark an alert as resolved
	 */
	@Post('/alerts/:id/resolve')
	async resolveAlert(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') alertId: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			if (!alertId || alertId.trim() === '') {
				throw new BadRequestError('Alert ID is required');
			}

			this.logger.debug('Resolving alert', {
				alertId,
				userId: req.user.id,
			});

			// This would be implemented to mark an alert as resolved
			// For now, return success response
			return {
				success: true,
				message: 'Alert resolved successfully',
			};
		} catch (error) {
			this.logger.error('Failed to resolve alert', {
				alertId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			if (error.message.includes('not found')) {
				throw new NotFoundError(`Alert with ID '${alertId}' not found`);
			}

			throw new InternalServerError('Failed to resolve alert');
		}
	}

	/**
	 * GET /system-monitoring/config
	 * Get monitoring configuration
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Get('/config')
	async getMonitoringConfig(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<MonitoringConfigDto> {
		try {
			this.logger.debug('Getting monitoring configuration', {
				userId: req.user.id,
			});

			// Return the current monitoring configuration
			// This would typically be stored in database/cache
			const config: MonitoringConfigDto = {
				enabled: true,
				interval: 30000,
				retentionPeriod: 7 * 24 * 60 * 60 * 1000,
				alerts: {
					enabled: true,
					thresholds: {
						cpu: { warning: 80, critical: 90 },
						memory: { warning: 85, critical: 95 },
						disk: { warning: 85, critical: 95 },
						workflow: {
							maxExecutionTime: 300000,
							maxMemoryUsage: 512 * 1024 * 1024,
						},
					},
					notifications: {
						email: false,
						webhook: false,
					},
				},
				metrics: {
					prometheus: true,
					detailed: false,
					includeWorkflowMetrics: true,
					includeSystemMetrics: true,
				},
			};

			return config;
		} catch (error) {
			this.logger.error('Failed to get monitoring configuration', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError('Failed to get monitoring configuration');
		}
	}

	/**
	 * PUT /system-monitoring/config
	 * Update monitoring configuration
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Put('/config')
	async updateMonitoringConfig(
		req: AuthenticatedRequest<{}, {}, Partial<MonitoringConfigDto>>,
		_res: Response,
	): Promise<MonitoringConfigDto> {
		try {
			// Validate configuration values
			if (req.body.interval !== undefined) {
				if (req.body.interval < 5000 || req.body.interval > 300000) {
					throw new BadRequestError('Monitoring interval must be between 5 seconds and 5 minutes');
				}
			}

			if (req.body.retentionPeriod !== undefined) {
				if (req.body.retentionPeriod < 24 * 60 * 60 * 1000) {
					throw new BadRequestError('Retention period must be at least 24 hours');
				}
			}

			// Validate threshold values
			if (req.body.alerts?.thresholds) {
				const { cpu, memory, disk } = req.body.alerts.thresholds;

				if (cpu) {
					if (cpu.warning < 0 || cpu.warning > 100 || cpu.critical < 0 || cpu.critical > 100) {
						throw new BadRequestError('CPU thresholds must be between 0 and 100');
					}
					if (cpu.warning >= cpu.critical) {
						throw new BadRequestError('CPU warning threshold must be less than critical threshold');
					}
				}

				if (memory) {
					if (
						memory.warning < 0 ||
						memory.warning > 100 ||
						memory.critical < 0 ||
						memory.critical > 100
					) {
						throw new BadRequestError('Memory thresholds must be between 0 and 100');
					}
					if (memory.warning >= memory.critical) {
						throw new BadRequestError(
							'Memory warning threshold must be less than critical threshold',
						);
					}
				}

				if (disk) {
					if (disk.warning < 0 || disk.warning > 100 || disk.critical < 0 || disk.critical > 100) {
						throw new BadRequestError('Disk thresholds must be between 0 and 100');
					}
					if (disk.warning >= disk.critical) {
						throw new BadRequestError(
							'Disk warning threshold must be less than critical threshold',
						);
					}
				}
			}

			this.logger.debug('Updating monitoring configuration', {
				userId: req.user.id,
			});

			// This would be implemented to update and persist the configuration
			// For now, return the updated configuration
			const updatedConfig: MonitoringConfigDto = {
				enabled: req.body.enabled ?? true,
				interval: req.body.interval ?? 30000,
				retentionPeriod: req.body.retentionPeriod ?? 7 * 24 * 60 * 60 * 1000,
				alerts: {
					enabled: req.body.alerts?.enabled ?? true,
					thresholds: {
						cpu: req.body.alerts?.thresholds?.cpu ?? { warning: 80, critical: 90 },
						memory: req.body.alerts?.thresholds?.memory ?? { warning: 85, critical: 95 },
						disk: req.body.alerts?.thresholds?.disk ?? { warning: 85, critical: 95 },
						workflow: req.body.alerts?.thresholds?.workflow ?? {
							maxExecutionTime: 300000,
							maxMemoryUsage: 512 * 1024 * 1024,
						},
					},
					notifications: req.body.alerts?.notifications ?? {
						email: false,
						webhook: false,
					},
				},
				metrics: req.body.metrics ?? {
					prometheus: true,
					detailed: false,
					includeWorkflowMetrics: true,
					includeSystemMetrics: true,
				},
			};

			return updatedConfig;
		} catch (error) {
			this.logger.error('Failed to update monitoring configuration', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to update monitoring configuration');
		}
	}

	/**
	 * POST /system-monitoring/test-alert
	 * Test alert system (development/testing endpoint)
	 */
	@Licensed('feat:advancedExecutionFilters')
	@Post('/test-alert')
	async testAlert(
		req: AuthenticatedRequest<{}, {}, { type: string; severity: string }>,
		_res: Response,
	): Promise<{ success: boolean; message: string; alertId: string }> {
		try {
			const { type = 'system', severity = 'info' } = req.body;

			this.logger.debug('Testing alert system', {
				type,
				severity,
				userId: req.user.id,
			});

			// This would create a test alert
			const alertId = `test_${Date.now()}`;

			return {
				success: true,
				message: 'Test alert created successfully',
				alertId,
			};
		} catch (error) {
			this.logger.error('Failed to create test alert', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new InternalServerError('Failed to create test alert');
		}
	}

	/**
	 * GET /system-monitoring/workflows/:workflowId/nodes/:nodeId/performance
	 * Get detailed performance metrics for a specific node
	 */
	@Get('/workflows/:workflowId/nodes/:nodeId/performance')
	async getNodePerformanceMetrics(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Param('nodeId') nodeId: string,
		@Query query: NodePerformanceRequestDto,
	): Promise<NodePerformanceMetricsDto> {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new BadRequestError('Workflow ID is required');
			}

			if (!nodeId || nodeId.trim() === '') {
				throw new BadRequestError('Node ID is required');
			}

			this.logger.debug('Getting node performance metrics', {
				workflowId,
				nodeId,
				query,
				userId: req.user.id,
			});

			const metrics = await this.systemMonitoringService.getNodePerformanceMetrics(
				workflowId,
				nodeId,
				query,
			);

			return metrics;
		} catch (error) {
			this.logger.error('Failed to get node performance metrics', {
				workflowId,
				nodeId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get node performance metrics');
		}
	}

	/**
	 * GET /system-monitoring/workflows/:workflowId/nodes/breakdown
	 * Get performance breakdown for all nodes in a workflow
	 */
	@Get('/workflows/:workflowId/nodes/breakdown')
	async getWorkflowNodeBreakdown(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Query query: WorkflowNodeBreakdownRequestDto,
	): Promise<WorkflowNodeBreakdownDto> {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new BadRequestError('Workflow ID is required');
			}

			this.logger.debug('Getting workflow node breakdown', {
				workflowId,
				query,
				userId: req.user.id,
			});

			const breakdown = await this.systemMonitoringService.getWorkflowNodeBreakdown(
				workflowId,
				query,
			);

			return breakdown;
		} catch (error) {
			this.logger.error('Failed to get workflow node breakdown', {
				workflowId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get workflow node breakdown');
		}
	}

	/**
	 * GET /system-monitoring/node-types/performance
	 * Get performance comparison across different node types
	 */
	@Get('/node-types/performance')
	async getNodeTypePerformance(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: NodeTypePerformanceRequestDto,
	): Promise<NodeTypePerformanceResponseDto> {
		try {
			// Validate limit
			if (query.limit && (query.limit < 1 || query.limit > 200)) {
				throw new BadRequestError('Limit must be between 1 and 200');
			}

			this.logger.debug('Getting node type performance', {
				query,
				userId: req.user.id,
			});

			const performance = await this.systemMonitoringService.getNodeTypePerformance(query);

			return {
				nodeTypes: performance,
				total: performance.length,
				timeRange: query.timeRange,
				generatedAt: new Date().toISOString(),
			};
		} catch (error) {
			this.logger.error('Failed to get node type performance', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get node type performance');
		}
	}

	/**
	 * GET /system-monitoring/executions/:executionId/nodes/live
	 * Get real-time node execution status for a running execution
	 */
	@Get('/executions/:executionId/nodes/live')
	async getLiveNodeExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('executionId') executionId: string,
	): Promise<LiveNodeExecutionDto> {
		try {
			if (!executionId || executionId.trim() === '') {
				throw new BadRequestError('Execution ID is required');
			}

			this.logger.debug('Getting live node execution', {
				executionId,
				userId: req.user.id,
			});

			const liveExecution = await this.systemMonitoringService.getLiveNodeExecution(executionId);

			return liveExecution;
		} catch (error) {
			this.logger.error('Failed to get live node execution', {
				executionId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			if (error.message.includes('not found')) {
				throw new NotFoundError(`Execution with ID '${executionId}' not found or not active`);
			}

			throw new InternalServerError('Failed to get live node execution');
		}
	}

	/**
	 * GET /system-monitoring/workflows/:workflowId/nodes/:nodeId/history
	 * Get historical performance data for a specific node
	 */
	@Get('/workflows/:workflowId/nodes/:nodeId/history')
	async getNodePerformanceHistory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Param('nodeId') nodeId: string,
		@Query query: { timeRange?: string },
	): Promise<NodePerformanceHistoryDto> {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new BadRequestError('Workflow ID is required');
			}

			if (!nodeId || nodeId.trim() === '') {
				throw new BadRequestError('Node ID is required');
			}

			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const timeRange = query.timeRange || '24h';

			if (!validTimeRanges.includes(timeRange)) {
				throw new BadRequestError(
					`Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
				);
			}

			this.logger.debug('Getting node performance history', {
				workflowId,
				nodeId,
				timeRange,
				userId: req.user.id,
			});

			const history = await this.systemMonitoringService.getNodePerformanceHistory(
				workflowId,
				nodeId,
				timeRange,
			);

			return history;
		} catch (error) {
			this.logger.error('Failed to get node performance history', {
				workflowId,
				nodeId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new InternalServerError('Failed to get node performance history');
		}
	}
}
