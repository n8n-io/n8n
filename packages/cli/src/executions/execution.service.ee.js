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
exports.EnterpriseExecutionsService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const execution_service_1 = require('./execution.service');
const workflow_service_ee_1 = require('../workflows/workflow.service.ee');
let EnterpriseExecutionsService = class EnterpriseExecutionsService {
	constructor(executionService, workflowRepository, enterpriseWorkflowService) {
		this.executionService = executionService;
		this.workflowRepository = workflowRepository;
		this.enterpriseWorkflowService = enterpriseWorkflowService;
	}
	async findOne(req, sharedWorkflowIds) {
		const execution = await this.executionService.findOne(req, sharedWorkflowIds);
		if (!execution) return;
		const workflow = await this.workflowRepository.get({
			id: execution.workflowId,
		});
		if (!workflow) return;
		const workflowWithSharingsMetaData =
			this.enterpriseWorkflowService.addOwnerAndSharings(workflow);
		await this.enterpriseWorkflowService.addCredentialsToWorkflow(
			workflowWithSharingsMetaData,
			req.user,
		);
		execution.workflowData = {
			...execution.workflowData,
			homeProject: workflowWithSharingsMetaData.homeProject,
			sharedWithProjects: workflowWithSharingsMetaData.sharedWithProjects,
			usedCredentials: workflowWithSharingsMetaData.usedCredentials,
		};
		return execution;
	}
};
exports.EnterpriseExecutionsService = EnterpriseExecutionsService;
exports.EnterpriseExecutionsService = EnterpriseExecutionsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			execution_service_1.ExecutionService,
			db_1.WorkflowRepository,
			workflow_service_ee_1.EnterpriseWorkflowService,
		]),
	],
	EnterpriseExecutionsService,
);
//# sourceMappingURL=execution.service.ee.js.map
