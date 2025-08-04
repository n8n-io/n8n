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
exports.WorkflowHistoryController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const shared_workflow_not_found_error_1 = require('@/errors/shared-workflow-not-found.error');
const workflow_history_version_not_found_error_1 = require('@/errors/workflow-history-version-not-found.error');
const workflow_history_helper_ee_1 = require('./workflow-history-helper.ee');
const workflow_history_service_ee_1 = require('./workflow-history.service.ee');
const DEFAULT_TAKE = 20;
let WorkflowHistoryController = class WorkflowHistoryController {
	constructor(historyService) {
		this.historyService = historyService;
	}
	workflowHistoryLicense(_req, res, next) {
		if (!(0, workflow_history_helper_ee_1.isWorkflowHistoryLicensed)()) {
			res.status(403);
			res.send('Workflow History license data not found');
			return;
		}
		next();
	}
	workflowHistoryEnabled(_req, res, next) {
		if (!(0, workflow_history_helper_ee_1.isWorkflowHistoryEnabled)()) {
			res.status(403);
			res.send('Workflow History is disabled');
			return;
		}
		next();
	}
	async getList(req, _res, query) {
		try {
			return await this.historyService.getList(
				req.user,
				req.params.workflowId,
				query.take ?? DEFAULT_TAKE,
				query.skip ?? 0,
			);
		} catch (e) {
			if (e instanceof shared_workflow_not_found_error_1.SharedWorkflowNotFoundError) {
				throw new not_found_error_1.NotFoundError('Could not find workflow');
			}
			throw e;
		}
	}
	async getVersion(req) {
		try {
			return await this.historyService.getVersion(
				req.user,
				req.params.workflowId,
				req.params.versionId,
			);
		} catch (e) {
			if (e instanceof shared_workflow_not_found_error_1.SharedWorkflowNotFoundError) {
				throw new not_found_error_1.NotFoundError('Could not find workflow');
			} else if (
				e instanceof workflow_history_version_not_found_error_1.WorkflowHistoryVersionNotFoundError
			) {
				throw new not_found_error_1.NotFoundError('Could not find version');
			}
			throw e;
		}
	}
};
exports.WorkflowHistoryController = WorkflowHistoryController;
__decorate(
	[
		(0, decorators_1.Middleware)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Function]),
		__metadata('design:returntype', void 0),
	],
	WorkflowHistoryController.prototype,
	'workflowHistoryLicense',
	null,
);
__decorate(
	[
		(0, decorators_1.Middleware)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Function]),
		__metadata('design:returntype', void 0),
	],
	WorkflowHistoryController.prototype,
	'workflowHistoryEnabled',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflow/:workflowId'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.PaginationDto]),
		__metadata('design:returntype', Promise),
	],
	WorkflowHistoryController.prototype,
	'getList',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/workflow/:workflowId/version/:versionId'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	WorkflowHistoryController.prototype,
	'getVersion',
	null,
);
exports.WorkflowHistoryController = WorkflowHistoryController = __decorate(
	[
		(0, decorators_1.RestController)('/workflow-history'),
		__metadata('design:paramtypes', [workflow_history_service_ee_1.WorkflowHistoryService]),
	],
	WorkflowHistoryController,
);
//# sourceMappingURL=workflow-history.controller.ee.js.map
