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
exports.ActiveWorkflowsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const activation_errors_service_1 = require('@/activation-errors.service');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
let ActiveWorkflowsService = class ActiveWorkflowsService {
	constructor(
		logger,
		workflowRepository,
		sharedWorkflowRepository,
		activationErrorsService,
		workflowFinderService,
	) {
		this.logger = logger;
		this.workflowRepository = workflowRepository;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.activationErrorsService = activationErrorsService;
		this.workflowFinderService = workflowFinderService;
	}
	async getAllActiveIdsInStorage() {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();
		return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}
	async getAllActiveIdsFor(user) {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();
		const hasFullAccess = (0, permissions_1.hasGlobalScope)(user, 'workflow:list');
		if (hasFullAccess) {
			return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
		}
		const sharedWorkflowIds =
			await this.sharedWorkflowRepository.getSharedWorkflowIds(activeWorkflowIds);
		return sharedWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}
	async getActivationError(workflowId, user) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			this.logger.warn('User attempted to access workflow errors without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new bad_request_error_1.BadRequestError(
				`Workflow with ID "${workflowId}" could not be found.`,
			);
		}
		return await this.activationErrorsService.get(workflowId);
	}
};
exports.ActiveWorkflowsService = ActiveWorkflowsService;
exports.ActiveWorkflowsService = ActiveWorkflowsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.WorkflowRepository,
			db_1.SharedWorkflowRepository,
			activation_errors_service_1.ActivationErrorsService,
			workflow_finder_service_1.WorkflowFinderService,
		]),
	],
	ActiveWorkflowsService,
);
//# sourceMappingURL=active-workflows.service.js.map
