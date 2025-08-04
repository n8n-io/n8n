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
exports.PerformanceMonitoringController = void 0;
const api_types_1 = require('@n8n/api-types');
const n8n_workflow_1 = require('n8n-workflow');
const performance_monitoring_service_1 = require('@/services/performance-monitoring.service');
const system_resources_service_1 = require('@/services/system-resources.service');
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
let PerformanceMonitoringController = class PerformanceMonitoringController {
	constructor(performanceService, systemResourcesService) {
		this.performanceService = performanceService;
		this.systemResourcesService = systemResourcesService;
		this.logger = n8n_workflow_1.LoggerProxy;
	}
	async getExecutionProfile(req, _res, executionId, query) {
		try {
			if (!executionId || executionId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Execution ID is required');
			}
			const options = {
				includeBottlenecks: this.parseBoolean(query.includeBottlenecks, true),
				includeResourceMetrics: this.parseBoolean(query.includeResourceMetrics, true),
			};
			this.logger.debug('Getting execution profile', {
				executionId,
				options,
				userId: req.user.id,
			});
			const profile = await this.performanceService.getExecutionProfile(executionId, options);
			return profile;
		} catch (error) {
			if (error.name === 'ApplicationError' && error.message.includes('not found')) {
				throw new not_found_error_1.NotFoundError(`Execution with ID '${executionId}' not found`);
			}
			this.logger.error('Failed to get execution profile', {
				executionId,
				userId: req.user.id,
				error: error.message,
			});
			throw error;
		}
	}
	async getSystemResources(req, _res, query) {
		try {
			const options = {
				includeWorkers: this.parseBoolean(query.includeWorkers, false),
				includeQueue: this.parseBoolean(query.includeQueue, false),
			};
			this.logger.debug('Getting system resources', {
				options,
				userId: req.user.id,
			});
			const resources = await this.systemResourcesService.getCurrentResources(options);
			return resources;
		} catch (error) {
			this.logger.error('Failed to get system resources', {
				userId: req.user.id,
				error: error.message,
			});
			throw error;
		}
	}
	async getPerformanceMetrics(req, _res, query) {
		try {
			if (query.startDate && query.endDate) {
				const startDate = new Date(query.startDate);
				const endDate = new Date(query.endDate);
				if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
					throw new bad_request_error_1.BadRequestError(
						'Invalid date format in startDate or endDate',
					);
				}
				if (startDate >= endDate) {
					throw new bad_request_error_1.BadRequestError('startDate must be before endDate');
				}
				const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
				if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
					throw new bad_request_error_1.BadRequestError('Time range cannot exceed 90 days');
				}
			}
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
					throw new bad_request_error_1.BadRequestError(
						`Invalid status values: ${invalidStatuses.join(', ')}`,
					);
				}
			}
			this.logger.debug('Getting performance metrics', {
				query,
				userId: req.user.id,
			});
			const metrics = await this.performanceService.getPerformanceMetrics(query);
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
	async getSystemHealth(req, _res) {
		try {
			this.logger.debug('Getting system health', {
				userId: req.user.id,
			});
			const health = await this.systemResourcesService.checkSystemHealth();
			return health;
		} catch (error) {
			this.logger.error('Failed to get system health', {
				userId: req.user.id,
				error: error.message,
			});
			throw error;
		}
	}
	async getExecutionBottlenecks(req, _res, executionId) {
		try {
			if (!executionId || executionId.trim() === '') {
				throw new bad_request_error_1.BadRequestError('Execution ID is required');
			}
			this.logger.debug('Getting execution bottlenecks', {
				executionId,
				userId: req.user.id,
			});
			const profile = await this.performanceService.getExecutionProfile(executionId, {
				includeBottlenecks: true,
				includeResourceMetrics: false,
			});
			const result = {
				executionId: profile.executionId,
				workflowId: profile.workflowId,
				bottlenecks: profile.bottlenecks,
				timestamp: new Date().toISOString(),
			};
			return result;
		} catch (error) {
			if (error.name === 'ApplicationError' && error.message.includes('not found')) {
				throw new not_found_error_1.NotFoundError(`Execution with ID '${executionId}' not found`);
			}
			this.logger.error('Failed to get execution bottlenecks', {
				executionId,
				userId: req.user.id,
				error: error.message,
			});
			throw error;
		}
	}
	parseBoolean(value, defaultValue) {
		if (value === undefined) return defaultValue;
		const normalized = value.toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
		return defaultValue;
	}
};
exports.PerformanceMonitoringController = PerformanceMonitoringController;
__decorate(
	[
		(0, decorators_1.Get)('/executions/:id/profile'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			api_types_1.ExecutionProfileRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	PerformanceMonitoringController.prototype,
	'getExecutionProfile',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/system/resources'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.SystemResourcesRequestDto]),
		__metadata('design:returntype', Promise),
	],
	PerformanceMonitoringController.prototype,
	'getSystemResources',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/metrics/performance'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.PerformanceMetricsRequestDto]),
		__metadata('design:returntype', Promise),
	],
	PerformanceMonitoringController.prototype,
	'getPerformanceMetrics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/system/health'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	PerformanceMonitoringController.prototype,
	'getSystemHealth',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/executions/:id/bottlenecks'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	PerformanceMonitoringController.prototype,
	'getExecutionBottlenecks',
	null,
);
exports.PerformanceMonitoringController = PerformanceMonitoringController = __decorate(
	[
		(0, decorators_1.RestController)('/performance-monitoring'),
		__metadata('design:paramtypes', [
			performance_monitoring_service_1.PerformanceMonitoringService,
			system_resources_service_1.SystemResourcesService,
		]),
	],
	PerformanceMonitoringController,
);
//# sourceMappingURL=performance-monitoring.controller.js.map
