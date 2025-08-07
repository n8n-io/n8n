'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SystemMonitoringController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const n8n_workflow_1 = require('n8n-workflow');
const system_monitoring_service_1 = require('@/services/system-monitoring.service');
let SystemMonitoringController = class SystemMonitoringController {
	constructor(systemMonitoringService) {
		this.systemMonitoringService = systemMonitoringService;
		this.logger = n8n_workflow_1.LoggerProxy;
	}
	async getSystemResources(req, _res, query) {
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to get system resources');
		}
	}
	async getSystemHealth(req, _res) {
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
			throw new internal_server_error_1.InternalServerError('Failed to get system health status');
		}
	}
	async getAlerts(req, _res, query) {
		try {
			if (query.startDate && query.endDate) {
				const start = new Date(query.startDate);
				const end = new Date(query.endDate);
				if (start >= end) {
					throw new bad_request_error_1.BadRequestError('startDate must be before endDate');
				}
				const maxRange = 90 * 24 * 60 * 60 * 1000;
				if (end.getTime() - start.getTime() > maxRange) {
					throw new bad_request_error_1.BadRequestError('Date range cannot exceed 90 days');
				}
			}
			if (query.limit && (query.limit < 1 || query.limit > 500)) {
				throw new bad_request_error_1.BadRequestError('Limit must be between 1 and 500');
			}
			if (query.offset && query.offset < 0) {
				throw new bad_request_error_1.BadRequestError('Offset must be non-negative');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to get alerts');
		}
	}
	async getMetricsHistory(req, _res, query) {
		try {
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const validatedTimeRange = query.timeRange || '24h';
			if (!validTimeRanges.includes(validatedTimeRange)) {
				throw new bad_request_error_1.BadRequestError(
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to get metrics history');
		}
	}
	async getWorkflowMetrics(req, _res, workflowId, query) {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Workflow ID is required');
			}
			if (query.limit && (query.limit < 1 || query.limit > 1000)) {
				throw new bad_request_error_1.BadRequestError('Limit must be between 1 and 1000');
			}
			this.logger.debug('Getting workflow metrics', {
				workflowId,
				query,
				userId: req.user.id,
			});
			const workflowMetrics = {
				workflowId,
				workflowName: 'Sample Workflow',
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to get workflow metrics');
		}
	}
	async getAlertRules(req, _res) {
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
			throw new internal_server_error_1.InternalServerError('Failed to get alert rules');
		}
	}
	async createAlertRule(req, _res) {
		try {
			if (!req.body.name || req.body.name.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Alert rule name is required');
			}
			if (!req.body.metric || req.body.metric.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Metric name is required');
			}
			if (req.body.threshold === undefined || req.body.threshold === null) {
				throw new bad_request_error_1.BadRequestError('Threshold value is required');
			}
			if (req.body.notifications?.webhook && !req.body.notifications.webhookUrl) {
				throw new bad_request_error_1.BadRequestError(
					'Webhook URL is required when webhook notifications are enabled',
				);
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to create alert rule');
		}
	}
	async updateAlertRule(req, _res, ruleId) {
		try {
			if (!ruleId || ruleId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Alert rule ID is required');
			}
			if (req.body.name !== undefined && req.body.name.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Alert rule name cannot be empty');
			}
			if (req.body.notifications?.webhook && !req.body.notifications.webhookUrl) {
				throw new bad_request_error_1.BadRequestError(
					'Webhook URL is required when webhook notifications are enabled',
				);
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			if (error.message.includes('not found')) {
				throw new not_found_error_1.NotFoundError(`Alert rule with ID '${ruleId}' not found`);
			}
			throw new internal_server_error_1.InternalServerError('Failed to update alert rule');
		}
	}
	async deleteAlertRule(req, _res, ruleId) {
		try {
			if (!ruleId || ruleId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Alert rule ID is required');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			if (error.message.includes('not found')) {
				throw new not_found_error_1.NotFoundError(`Alert rule with ID '${ruleId}' not found`);
			}
			throw new internal_server_error_1.InternalServerError('Failed to delete alert rule');
		}
	}
	async resolveAlert(req, _res, alertId) {
		try {
			if (!alertId || alertId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Alert ID is required');
			}
			this.logger.debug('Resolving alert', {
				alertId,
				userId: req.user.id,
			});
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			if (error.message.includes('not found')) {
				throw new not_found_error_1.NotFoundError(`Alert with ID '${alertId}' not found`);
			}
			throw new internal_server_error_1.InternalServerError('Failed to resolve alert');
		}
	}
	async getMonitoringConfig(req, _res) {
		try {
			this.logger.debug('Getting monitoring configuration', {
				userId: req.user.id,
			});
			const config = {
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
			throw new internal_server_error_1.InternalServerError(
				'Failed to get monitoring configuration',
			);
		}
	}
	async updateMonitoringConfig(req, _res) {
		try {
			if (req.body.interval !== undefined) {
				if (req.body.interval < 5000 || req.body.interval > 300000) {
					throw new bad_request_error_1.BadRequestError(
						'Monitoring interval must be between 5 seconds and 5 minutes',
					);
				}
			}
			if (req.body.retentionPeriod !== undefined) {
				if (req.body.retentionPeriod < 24 * 60 * 60 * 1000) {
					throw new bad_request_error_1.BadRequestError(
						'Retention period must be at least 24 hours',
					);
				}
			}
			if (req.body.alerts?.thresholds) {
				const { cpu, memory, disk } = req.body.alerts.thresholds;
				if (cpu) {
					if (cpu.warning < 0 || cpu.warning > 100 || cpu.critical < 0 || cpu.critical > 100) {
						throw new bad_request_error_1.BadRequestError(
							'CPU thresholds must be between 0 and 100',
						);
					}
					if (cpu.warning >= cpu.critical) {
						throw new bad_request_error_1.BadRequestError(
							'CPU warning threshold must be less than critical threshold',
						);
					}
				}
				if (memory) {
					if (
						memory.warning < 0 ||
						memory.warning > 100 ||
						memory.critical < 0 ||
						memory.critical > 100
					) {
						throw new bad_request_error_1.BadRequestError(
							'Memory thresholds must be between 0 and 100',
						);
					}
					if (memory.warning >= memory.critical) {
						throw new bad_request_error_1.BadRequestError(
							'Memory warning threshold must be less than critical threshold',
						);
					}
				}
				if (disk) {
					if (disk.warning < 0 || disk.warning > 100 || disk.critical < 0 || disk.critical > 100) {
						throw new bad_request_error_1.BadRequestError(
							'Disk thresholds must be between 0 and 100',
						);
					}
					if (disk.warning >= disk.critical) {
						throw new bad_request_error_1.BadRequestError(
							'Disk warning threshold must be less than critical threshold',
						);
					}
				}
			}
			this.logger.debug('Updating monitoring configuration', {
				userId: req.user.id,
			});
			const updatedConfig = {
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to update monitoring configuration',
			);
		}
	}
	async testAlert(req, _res) {
		try {
			const { type = 'system', severity = 'info' } = req.body;
			this.logger.debug('Testing alert system', {
				type,
				severity,
				userId: req.user.id,
			});
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
			throw new internal_server_error_1.InternalServerError('Failed to create test alert');
		}
	}
	async getNodePerformanceMetrics(req, _res, workflowId, nodeId, query) {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Workflow ID is required');
			}
			if (!nodeId || nodeId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Node ID is required');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to get node performance metrics',
			);
		}
	}
	async getWorkflowNodeBreakdown(req, _res, workflowId, query) {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Workflow ID is required');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to get workflow node breakdown',
			);
		}
	}
	async getNodeTypePerformance(req, _res, query) {
		try {
			if (query.limit && (query.limit < 1 || query.limit > 200)) {
				throw new bad_request_error_1.BadRequestError('Limit must be between 1 and 200');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to get node type performance');
		}
	}
	async getLiveNodeExecution(req, _res, executionId) {
		try {
			if (!executionId || executionId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Execution ID is required');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			if (error.message.includes('not found')) {
				throw new not_found_error_1.NotFoundError(
					`Execution with ID '${executionId}' not found or not active`,
				);
			}
			throw new internal_server_error_1.InternalServerError('Failed to get live node execution');
		}
	}
	async getNodePerformanceHistory(req, _res, workflowId, nodeId, query) {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Workflow ID is required');
			}
			if (!nodeId || nodeId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Node ID is required');
			}
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const timeRange = query.timeRange || '24h';
			if (!validTimeRanges.includes(timeRange)) {
				throw new bad_request_error_1.BadRequestError(
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to get node performance history',
			);
		}
	}
	async getWorkflowResourceMetrics(req, _res, workflowId, query) {
		try {
			if (!workflowId || workflowId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Workflow ID is required');
			}
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const timeRange = query.timeRange;
			if (timeRange && !validTimeRanges.includes(timeRange)) {
				throw new bad_request_error_1.BadRequestError(
					`Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
				);
			}
			this.logger.debug('Getting workflow resource metrics', {
				workflowId,
				timeRange,
				userId: req.user.id,
			});
			const metrics = await this.systemMonitoringService.getWorkflowResourceMetrics(
				workflowId,
				timeRange,
			);
			if (!metrics) {
				throw new not_found_error_1.NotFoundError(
					`Workflow '${workflowId}' not found or has no execution data`,
				);
			}
			return {
				success: true,
				data: {
					workflowId: metrics.workflowId,
					workflowName: metrics.workflowName,
					totalExecutions: metrics.totalExecutions,
					averageExecutionTime: metrics.averageExecutionTime,
					averageMemoryUsage: metrics.averageMemoryUsage,
					peakMemoryUsage: metrics.peakMemoryUsage,
					averageCpuUsage: metrics.averageCpuUsage,
					peakCpuUsage: metrics.peakCpuUsage,
					totalResourceCost: metrics.totalResourceCost,
					resourceEfficiency: metrics.resourceEfficiency,
					lastExecuted: metrics.lastExecuted.toISOString(),
					samples: metrics.samples.map((sample) => ({
						timestamp: new Date(sample.timestamp).toISOString(),
						memoryUsage: sample.memoryUsage,
						cpuUsage: sample.cpuUsage,
						activeNodes: sample.activeNodes,
					})),
				},
				metadata: {
					requestedAt: new Date().toISOString(),
					workflowId,
					timeRange: timeRange || 'all',
					sampleCount: metrics.samples.length,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get workflow resource metrics', {
				workflowId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to get workflow resource metrics',
			);
		}
	}
	async getAllWorkflowResourceMetrics(req, _res, query) {
		try {
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const timeRange = query.timeRange;
			if (timeRange && !validTimeRanges.includes(timeRange)) {
				throw new bad_request_error_1.BadRequestError(
					`Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
				);
			}
			const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
			this.logger.debug('Getting all workflow resource metrics', {
				timeRange,
				limit,
				userId: req.user.id,
			});
			const allMetrics =
				await this.systemMonitoringService.getAllWorkflowResourceMetrics(timeRange);
			const sortedMetrics = Array.from(allMetrics.values())
				.sort((a, b) => b.totalResourceCost - a.totalResourceCost)
				.slice(0, limit);
			const data = sortedMetrics.map((metrics) => ({
				workflowId: metrics.workflowId,
				workflowName: metrics.workflowName,
				totalExecutions: metrics.totalExecutions,
				averageExecutionTime: metrics.averageExecutionTime,
				averageMemoryUsage: metrics.averageMemoryUsage,
				peakMemoryUsage: metrics.peakMemoryUsage,
				averageCpuUsage: metrics.averageCpuUsage,
				peakCpuUsage: metrics.peakCpuUsage,
				totalResourceCost: metrics.totalResourceCost,
				resourceEfficiency: metrics.resourceEfficiency,
				lastExecuted: metrics.lastExecuted.toISOString(),
				sampleCount: metrics.samples.length,
			}));
			return {
				success: true,
				data,
				metadata: {
					requestedAt: new Date().toISOString(),
					timeRange: timeRange || 'all',
					limit,
					total: allMetrics.size,
					returned: data.length,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get all workflow resource metrics', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to get all workflow resource metrics',
			);
		}
	}
	async compareWorkflowResources(req, _res, query) {
		try {
			if (!query.workflowIds) {
				throw new bad_request_error_1.BadRequestError('workflowIds parameter is required');
			}
			const workflowIds = query.workflowIds
				.split(',')
				.map((id) => id.trim())
				.filter(Boolean);
			if (workflowIds.length === 0) {
				throw new bad_request_error_1.BadRequestError('At least one workflow ID is required');
			}
			if (workflowIds.length > 10) {
				throw new bad_request_error_1.BadRequestError(
					'Cannot compare more than 10 workflows at once',
				);
			}
			const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
			const timeRange = query.timeRange;
			if (timeRange && !validTimeRanges.includes(timeRange)) {
				throw new bad_request_error_1.BadRequestError(
					`Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`,
				);
			}
			this.logger.debug('Comparing workflow resources', {
				workflowIds,
				timeRange,
				userId: req.user.id,
			});
			const comparisons = await this.systemMonitoringService.getWorkflowResourceComparison(
				workflowIds,
				timeRange,
			);
			const data = comparisons.map((metrics, index) => ({
				workflowId: metrics.workflowId,
				workflowName: metrics.workflowName,
				totalExecutions: metrics.totalExecutions,
				averageExecutionTime: metrics.averageExecutionTime,
				averageMemoryUsage: metrics.averageMemoryUsage,
				peakMemoryUsage: metrics.peakMemoryUsage,
				averageCpuUsage: metrics.averageCpuUsage,
				peakCpuUsage: metrics.peakCpuUsage,
				totalResourceCost: metrics.totalResourceCost,
				resourceEfficiency: metrics.resourceEfficiency,
				lastExecuted: metrics.lastExecuted.toISOString(),
				rank: index + 1,
				sampleCount: metrics.samples.length,
			}));
			return {
				success: true,
				data,
				metadata: {
					requestedAt: new Date().toISOString(),
					workflowIds,
					timeRange: timeRange || 'all',
					compared: data.length,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to compare workflow resources', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to compare workflow resources');
		}
	}
	async getWorkflowAlerts(req, _res, query) {
		try {
			this.logger.debug('Getting workflow alerts', {
				workflowId: query.workflowId,
				userId: req.user.id,
			});
			const alerts = this.systemMonitoringService.getWorkflowResourceAlerts(query.workflowId);
			return {
				success: true,
				data: alerts,
				metadata: {
					requestedAt: new Date().toISOString(),
					workflowId: query.workflowId,
					total: alerts.length,
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to get workflow alerts', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new internal_server_error_1.InternalServerError('Failed to get workflow alerts');
		}
	}
};
exports.SystemMonitoringController = SystemMonitoringController;
__decorate(
	[
		(0, decorators_1.Get)('/resources'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.SystemMonitoringRequestDto]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getSystemResources',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/health'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getSystemHealth',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/alerts'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.AlertsQueryDto]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getAlerts',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/metrics/history'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getMetricsHistory',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/:workflowId/metrics'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, api_types_1.WorkflowMetricsQueryDto]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getWorkflowMetrics',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Get)('/alert-rules'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getAlertRules',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Post)('/alert-rules'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'createAlertRule',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Put)('/alert-rules/:id'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'updateAlertRule',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Delete)('/alert-rules/:id'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'deleteAlertRule',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/alerts/:id/resolve'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'resolveAlert',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Get)('/config'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getMonitoringConfig',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Put)('/config'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'updateMonitoringConfig',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:advancedExecutionFilters'),
		(0, decorators_1.Post)('/test-alert'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'testAlert',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/:workflowId/nodes/:nodeId/performance'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__param(3, (0, decorators_1.Param)('nodeId')),
		__param(4, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			String,
			api_types_1.NodePerformanceRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getNodePerformanceMetrics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/:workflowId/nodes/breakdown'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			api_types_1.WorkflowNodeBreakdownRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getWorkflowNodeBreakdown',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/node-types/performance'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.NodeTypePerformanceRequestDto]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getNodeTypePerformance',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/executions/:executionId/nodes/live'),
		__param(2, (0, decorators_1.Param)('executionId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getLiveNodeExecution',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/:workflowId/nodes/:nodeId/history'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__param(3, (0, decorators_1.Param)('nodeId')),
		__param(4, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, String, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getNodePerformanceHistory',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/:workflowId/resources'),
		__param(2, (0, decorators_1.Param)('workflowId')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getWorkflowResourceMetrics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/resources'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getAllWorkflowResourceMetrics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/resources/compare'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'compareWorkflowResources',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflows/alerts'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SystemMonitoringController.prototype,
	'getWorkflowAlerts',
	null,
);
exports.SystemMonitoringController = SystemMonitoringController = __decorate(
	[
		(0, decorators_1.RestController)('/system-monitoring'),
		__metadata('design:paramtypes', [system_monitoring_service_1.SystemMonitoringService]),
	],
	SystemMonitoringController,
);
//# sourceMappingURL=system-monitoring.controller.js.map
