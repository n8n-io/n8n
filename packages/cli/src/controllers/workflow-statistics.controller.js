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
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowStatisticsController = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
let WorkflowStatisticsController = class WorkflowStatisticsController {
	constructor(workflowFinderService, workflowStatisticsRepository, logger) {
		this.workflowFinderService = workflowFinderService;
		this.workflowStatisticsRepository = workflowStatisticsRepository;
		this.logger = logger;
	}
	async hasWorkflowAccess(req, _res, next) {
		const { user } = req;
		const workflowId = req.params.id;
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (workflow) {
			next();
		} else {
			this.logger.warn('User attempted to read a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new not_found_error_1.NotFoundError(`Workflow ${workflowId} does not exist.`);
		}
	}
	async getCounts(req) {
		return await this.getData(req.params.id, 'count', 0);
	}
	async getTimes(req) {
		return await this.getData(req.params.id, 'latestEvent', null);
	}
	async getDataLoaded(req) {
		const workflowId = req.params.id;
		const stats = await this.workflowStatisticsRepository.findOne({
			select: ['latestEvent'],
			where: {
				workflowId,
				name: 'data_loaded',
			},
		});
		return {
			dataLoaded: stats ? true : false,
		};
	}
	async getData(workflowId, columnName, defaultValue) {
		const stats = await this.workflowStatisticsRepository.find({
			select: [columnName, 'name'],
			where: { workflowId },
		});
		const data = {
			productionSuccess: defaultValue,
			productionError: defaultValue,
			manualSuccess: defaultValue,
			manualError: defaultValue,
		};
		stats.forEach(({ name, [columnName]: value }) => {
			switch (name) {
				case 'manual_error':
					data.manualError = value;
					break;
				case 'manual_success':
					data.manualSuccess = value;
					break;
				case 'production_error':
					data.productionError = value;
					break;
				case 'production_success':
					data.productionSuccess = value;
			}
		});
		return data;
	}
};
exports.WorkflowStatisticsController = WorkflowStatisticsController;
__decorate(
	[
		(0, decorators_1.Middleware)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Function]),
		__metadata('design:returntype', Promise),
	],
	WorkflowStatisticsController.prototype,
	'hasWorkflowAccess',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/counts/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowStatisticsController.prototype,
	'getCounts',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/times/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowStatisticsController.prototype,
	'getTimes',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/data-loaded/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowStatisticsController.prototype,
	'getDataLoaded',
	null,
);
exports.WorkflowStatisticsController = WorkflowStatisticsController = __decorate(
	[
		(0, decorators_1.RestController)('/workflow-stats'),
		__metadata('design:paramtypes', [
			workflow_finder_service_1.WorkflowFinderService,
			db_1.WorkflowStatisticsRepository,
			backend_common_1.Logger,
		]),
	],
	WorkflowStatisticsController,
);
//# sourceMappingURL=workflow-statistics.controller.js.map
