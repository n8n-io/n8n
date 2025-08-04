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
exports.SubworkflowPolicyChecker = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const subworkflow_policy_denial_error_1 = require('@/errors/subworkflow-policy-denial.error');
const access_service_1 = require('@/services/access.service');
const ownership_service_1 = require('@/services/ownership.service');
const url_service_1 = require('@/services/url.service');
let SubworkflowPolicyChecker = class SubworkflowPolicyChecker {
	constructor(logger, ownershipService, globalConfig, accessService, urlService) {
		this.logger = logger;
		this.ownershipService = ownershipService;
		this.globalConfig = globalConfig;
		this.accessService = accessService;
		this.urlService = urlService;
		this.denialReasons = {
			none: 'Subworkflow may not be called by any workflow',
			workflowsFromAList: 'Subworkflow may be called only by workflows from an allowlist',
			workflowsFromSameOwner:
				'Subworkflow may be called only by workflows owned by the same project',
		};
	}
	async check(subworkflow, parentWorkflowId, node, userId) {
		const { id: subworkflowId } = subworkflow;
		if (!subworkflowId) return;
		const policy = this.findPolicy(subworkflow);
		if (policy === 'any') return;
		if (policy === 'workflowsFromAList' && this.isListed(subworkflow, parentWorkflowId)) return;
		const { parentWorkflowProject, subworkflowProject } = await this.findProjects({
			parentWorkflowId,
			subworkflowId,
		});
		const areOwnedBySameProject = parentWorkflowProject.id === subworkflowProject.id;
		if (policy === 'workflowsFromSameOwner' && areOwnedBySameProject) return;
		this.logDenial({ parentWorkflowId, subworkflowId, policy });
		const errorDetails = await this.errorDetails(subworkflowProject, subworkflow, userId);
		throw new subworkflow_policy_denial_error_1.SubworkflowPolicyDenialError({
			subworkflowId,
			subworkflowProject,
			node,
			instanceUrl: this.urlService.getInstanceBaseUrl(),
			...errorDetails,
		});
	}
	async errorDetails(subworkflowProject, subworkflow, userId) {
		const hasReadAccess = userId
			? await this.accessService.hasReadAccess(userId, subworkflow.id)
			: false;
		if (subworkflowProject.type === 'team') return { hasReadAccess };
		const owner = await this.ownershipService.getPersonalProjectOwnerCached(subworkflowProject.id);
		return {
			hasReadAccess,
			ownerName: owner ? owner.firstName + ' ' + owner.lastName : 'No owner (team project)',
		};
	}
	findPolicy(subworkflow) {
		return (
			subworkflow.settings.callerPolicy ?? this.globalConfig.workflows.callerPolicyDefaultOption
		);
	}
	async findProjects({ parentWorkflowId, subworkflowId }) {
		const [parentWorkflowProject, subworkflowProject] = await Promise.all([
			this.ownershipService.getWorkflowProjectCached(parentWorkflowId),
			this.ownershipService.getWorkflowProjectCached(subworkflowId),
		]);
		return { parentWorkflowProject, subworkflowProject };
	}
	isListed(subworkflow, parentWorkflowId) {
		const callerIds =
			subworkflow.settings.callerIds
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id !== '') ?? [];
		return callerIds.includes(parentWorkflowId);
	}
	logDenial({ parentWorkflowId, subworkflowId, policy }) {
		this.logger.warn('[SubworkflowPolicyChecker] Subworkflow execution denied', {
			reason: this.denialReasons[policy],
			parentWorkflowId,
			subworkflowId,
		});
	}
};
exports.SubworkflowPolicyChecker = SubworkflowPolicyChecker;
exports.SubworkflowPolicyChecker = SubworkflowPolicyChecker = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			ownership_service_1.OwnershipService,
			config_1.GlobalConfig,
			access_service_1.AccessService,
			url_service_1.UrlService,
		]),
	],
	SubworkflowPolicyChecker,
);
//# sourceMappingURL=subworkflow-policy-checker.js.map
