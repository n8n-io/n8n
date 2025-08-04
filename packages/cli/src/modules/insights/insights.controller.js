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
exports.InsightsController = exports.ForbiddenError = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const insights_service_1 = require('./insights.service');
class ForbiddenError extends Error {
	constructor() {
		super(...arguments);
		this.httpStatusCode = 403;
		this.errorCode = 403;
		this.shouldReport = false;
	}
}
exports.ForbiddenError = ForbiddenError;
let InsightsController = class InsightsController {
	constructor(insightsService) {
		this.insightsService = insightsService;
	}
	getMaxAgeInDaysAndGranularity(payload) {
		try {
			return this.insightsService.getMaxAgeInDaysAndGranularity(payload.dateRange ?? 'week');
		} catch (error) {
			throw new ForbiddenError(error.message);
		}
	}
	async getInsightsSummary(_req, _res, payload = { dateRange: 'week' }) {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);
		return await this.insightsService.getInsightsSummary({
			periodLengthInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
		});
	}
	async getInsightsByWorkflow(_req, _res, payload) {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity({
			dateRange: payload.dateRange ?? 'week',
		});
		return await this.insightsService.getInsightsByWorkflow({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
		});
	}
	async getInsightsByTime(_req, _res, payload) {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);
		return await this.insightsService.getInsightsByTime({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			periodUnit: dateRangeAndMaxAgeInDays.granularity,
		});
	}
	async getTimeSavedInsightsByTime(_req, _res, payload) {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);
		return await this.insightsService.getInsightsByTime({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			periodUnit: dateRangeAndMaxAgeInDays.granularity,
			insightTypes: ['time_saved_min'],
		});
	}
};
exports.InsightsController = InsightsController;
__decorate(
	[
		(0, decorators_1.Get)('/summary'),
		(0, decorators_1.GlobalScope)('insights:list'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.InsightsDateFilterDto]),
		__metadata('design:returntype', Promise),
	],
	InsightsController.prototype,
	'getInsightsSummary',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/by-workflow'),
		(0, decorators_1.GlobalScope)('insights:list'),
		(0, decorators_1.Licensed)('feat:insights:viewDashboard'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.ListInsightsWorkflowQueryDto]),
		__metadata('design:returntype', Promise),
	],
	InsightsController.prototype,
	'getInsightsByWorkflow',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/by-time'),
		(0, decorators_1.GlobalScope)('insights:list'),
		(0, decorators_1.Licensed)('feat:insights:viewDashboard'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.InsightsDateFilterDto]),
		__metadata('design:returntype', Promise),
	],
	InsightsController.prototype,
	'getInsightsByTime',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/by-time/time-saved'),
		(0, decorators_1.GlobalScope)('insights:list'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.InsightsDateFilterDto]),
		__metadata('design:returntype', Promise),
	],
	InsightsController.prototype,
	'getTimeSavedInsightsByTime',
	null,
);
exports.InsightsController = InsightsController = __decorate(
	[
		(0, decorators_1.RestController)('/insights'),
		__metadata('design:paramtypes', [insights_service_1.InsightsService]),
	],
	InsightsController,
);
//# sourceMappingURL=insights.controller.js.map
