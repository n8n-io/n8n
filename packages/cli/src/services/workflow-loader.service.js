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
exports.WorkflowLoaderService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
let WorkflowLoaderService = class WorkflowLoaderService {
	constructor(workflowRepository) {
		this.workflowRepository = workflowRepository;
	}
	async get(workflowId) {
		const workflow = await this.workflowRepository.findById(workflowId);
		if (!workflow) {
			throw new n8n_workflow_1.UserError(`Failed to find workflow with ID "${workflowId}"`);
		}
		return workflow;
	}
};
exports.WorkflowLoaderService = WorkflowLoaderService;
exports.WorkflowLoaderService = WorkflowLoaderService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [db_1.WorkflowRepository])],
	WorkflowLoaderService,
);
//# sourceMappingURL=workflow-loader.service.js.map
