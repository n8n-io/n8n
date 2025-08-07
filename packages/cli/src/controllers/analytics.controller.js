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
exports.AnalyticsController = void 0;
const decorators_1 = require('@n8n/decorators');
const backend_common_1 = require('@n8n/backend-common');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const analytics_service_1 = require('@/services/analytics.service');
const error_analytics_service_1 = require('@/services/error-analytics.service');
let AnalyticsController = class AnalyticsController {
	constructor(logger, analyticsService, errorAnalyticsService) {
		this.logger = logger;
		this.analyticsService = analyticsService;
		this.errorAnalyticsService = errorAnalyticsService;
	}
	async getSystemAnalytics(req, _res, queryDto) {
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
			throw new internal_server_error_1.InternalServerError(
				`Failed to get system analytics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getNodeErrorBreakdown(req, _res, nodeType, queryDto) {
		this.logger.debug('Node error breakdown requested', {
			userId: req.user.id,
			nodeType,
			timeRange: queryDto.timeRange,
		});
		try {
			if (!nodeType || nodeType.trim().length === 0) {
				throw new bad_request_error_1.BadRequestError('Node type is required');
			}
			const timeRange = this.parseTimeRange(queryDto.timeRange);
			const breakdown = await this.errorAnalyticsService.getNodeErrorBreakdown(nodeType, timeRange);
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to get node error breakdown: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getNodeTypeAnalytics(req, _res, nodeType, queryDto) {
		this.logger.debug('Node type analytics requested', {
			userId: req.user.id,
			nodeType,
			timeRange: queryDto.timeRange,
		});
		try {
			if (!nodeType || nodeType.trim().length === 0) {
				throw new bad_request_error_1.BadRequestError('Node type is required');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to get node type analytics: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getAllNodeTypes(req, _res, queryDto) {
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
			throw new internal_server_error_1.InternalServerError(
				`Failed to get all node types: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async compareNodeTypes(req, _res, queryDto) {
		this.logger.debug('Node comparison requested', {
			userId: req.user.id,
			nodeTypes: queryDto.nodeTypes,
			timeRange: queryDto.timeRange,
		});
		try {
			if (!queryDto.nodeTypes || queryDto.nodeTypes.length === 0) {
				throw new bad_request_error_1.BadRequestError(
					'At least one node type is required for comparison',
				);
			}
			if (queryDto.nodeTypes.length > 10) {
				throw new bad_request_error_1.BadRequestError(
					'Cannot compare more than 10 node types at once',
				);
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to compare node types: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getErrorPatterns(req, _res, queryDto) {
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
			throw new internal_server_error_1.InternalServerError(
				`Failed to get error patterns: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async getPerformanceCorrelation(req, _res, nodeType, queryDto) {
		this.logger.debug('Performance correlation requested', {
			userId: req.user.id,
			nodeType,
			timeRange: queryDto.timeRange,
		});
		try {
			if (!nodeType || nodeType.trim().length === 0) {
				throw new bad_request_error_1.BadRequestError('Node type is required');
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
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to get performance correlation: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	parseTimeRange(timeRangeStr) {
		if (!timeRangeStr) {
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 7);
			return { start, end };
		}
		try {
			if (timeRangeStr.includes(',')) {
				const [startStr, endStr] = timeRangeStr.split(',');
				const start = new Date(parseInt(startStr, 10));
				const end = new Date(parseInt(endStr, 10));
				if (isNaN(start.getTime()) || isNaN(end.getTime())) {
					throw new bad_request_error_1.BadRequestError('Invalid timestamp format');
				}
				if (start >= end) {
					throw new bad_request_error_1.BadRequestError('Start time must be before end time');
				}
				return { start, end };
			}
			const end = new Date();
			const start = new Date();
			if (timeRangeStr.endsWith('d')) {
				const days = parseInt(timeRangeStr.slice(0, -1), 10);
				if (isNaN(days) || days <= 0 || days > 365) {
					throw new bad_request_error_1.BadRequestError('Invalid day range (1-365 days allowed)');
				}
				start.setDate(start.getDate() - days);
			} else if (timeRangeStr.endsWith('h')) {
				const hours = parseInt(timeRangeStr.slice(0, -1), 10);
				if (isNaN(hours) || hours <= 0 || hours > 24 * 30) {
					throw new bad_request_error_1.BadRequestError('Invalid hour range (1-720 hours allowed)');
				}
				start.setHours(start.getHours() - hours);
			} else if (timeRangeStr.endsWith('m')) {
				const minutes = parseInt(timeRangeStr.slice(0, -1), 10);
				if (isNaN(minutes) || minutes <= 0 || minutes > 60 * 24 * 7) {
					throw new bad_request_error_1.BadRequestError(
						'Invalid minute range (1-10080 minutes allowed)',
					);
				}
				start.setMinutes(start.getMinutes() - minutes);
			} else {
				throw new bad_request_error_1.BadRequestError(
					'Invalid time range format. Use "7d", "24h", "60m" or "start_timestamp,end_timestamp"',
				);
			}
			return { start, end };
		} catch (error) {
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new bad_request_error_1.BadRequestError('Failed to parse time range');
		}
	}
};
exports.AnalyticsController = AnalyticsController;
__decorate(
	[
		(0, decorators_1.Get)('/system'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'getSystemAnalytics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/nodes/:nodeType/error-breakdown'),
		__param(2, (0, decorators_1.Param)('nodeType')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'getNodeErrorBreakdown',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/nodes/:nodeType'),
		__param(2, (0, decorators_1.Param)('nodeType')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'getNodeTypeAnalytics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/nodes'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'getAllNodeTypes',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/nodes/compare'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'compareNodeTypes',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/error-patterns'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'getErrorPatterns',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/nodes/:nodeType/performance-correlation'),
		__param(2, (0, decorators_1.Param)('nodeType')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	AnalyticsController.prototype,
	'getPerformanceCorrelation',
	null,
);
exports.AnalyticsController = AnalyticsController = __decorate(
	[
		(0, decorators_1.RestController)('/analytics'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			analytics_service_1.AnalyticsService,
			error_analytics_service_1.ErrorAnalyticsService,
		]),
	],
	AnalyticsController,
);
//# sourceMappingURL=analytics.controller.js.map
