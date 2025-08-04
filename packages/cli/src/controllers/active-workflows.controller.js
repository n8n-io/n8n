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
exports.ActiveWorkflowsController = void 0;
const decorators_1 = require('@n8n/decorators');
const active_workflows_service_1 = require('@/services/active-workflows.service');
let ActiveWorkflowsController = class ActiveWorkflowsController {
	constructor(activeWorkflowsService) {
		this.activeWorkflowsService = activeWorkflowsService;
	}
	async getActiveWorkflows(req) {
		return await this.activeWorkflowsService.getAllActiveIdsFor(req.user);
	}
	async getActivationError(req) {
		const {
			user,
			params: { id: workflowId },
		} = req;
		return await this.activeWorkflowsService.getActivationError(workflowId, user);
	}
};
exports.ActiveWorkflowsController = ActiveWorkflowsController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ActiveWorkflowsController.prototype,
	'getActiveWorkflows',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/error/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ActiveWorkflowsController.prototype,
	'getActivationError',
	null,
);
exports.ActiveWorkflowsController = ActiveWorkflowsController = __decorate(
	[
		(0, decorators_1.RestController)('/active-workflows'),
		__metadata('design:paramtypes', [active_workflows_service_1.ActiveWorkflowsService]),
	],
	ActiveWorkflowsController,
);
//# sourceMappingURL=active-workflows.controller.js.map
