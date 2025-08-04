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
exports.CredentialsPermissionChecker = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const n8n_workflow_1 = require('n8n-workflow');
const ownership_service_1 = require('@/services/ownership.service');
const project_service_ee_1 = require('@/services/project.service.ee');
class InvalidCredentialError extends n8n_workflow_1.UserError {
	constructor(node) {
		super(`Node "${node.name}" uses invalid credential`);
		this.node = node;
		this.description = 'Please recreate the credential.';
	}
}
class InaccessibleCredentialError extends n8n_workflow_1.UserError {
	constructor(node, project) {
		super(`Node "${node.name}" does not have access to the credential`);
		this.node = node;
		this.project = project;
		this.description =
			this.project.type === 'personal'
				? 'Please recreate the credential or ask its owner to share it with you.'
				: `Please make sure that the credential is shared with the project "${this.project.name}"`;
	}
}
let CredentialsPermissionChecker = class CredentialsPermissionChecker {
	constructor(sharedCredentialsRepository, ownershipService, projectService) {
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.ownershipService = ownershipService;
		this.projectService = projectService;
	}
	async check(workflowId, nodes) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const homeProjectOwner = await this.ownershipService.getPersonalProjectOwnerCached(
			homeProject.id,
		);
		if (
			homeProject.type === 'personal' &&
			homeProjectOwner &&
			(0, permissions_1.hasGlobalScope)(homeProjectOwner, 'credential:list')
		) {
			return;
		}
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);
		const workflowCredIds = Object.keys(credIdsToNodes);
		if (workflowCredIds.length === 0) return;
		const accessible = await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
			projectIds,
			workflowCredIds,
		);
		for (const credentialsId of workflowCredIds) {
			if (!accessible.includes(credentialsId)) {
				const nodeToFlag = credIdsToNodes[credentialsId][0];
				throw new InaccessibleCredentialError(nodeToFlag, homeProject);
			}
		}
	}
	mapCredIdsToNodes(nodes) {
		return nodes.reduce((map, node) => {
			if (node.disabled || !node.credentials) return map;
			Object.values(node.credentials).forEach((cred) => {
				if (!cred.id) throw new InvalidCredentialError(node);
				map[cred.id] = map[cred.id] ? [...map[cred.id], node] : [node];
			});
			return map;
		}, {});
	}
};
exports.CredentialsPermissionChecker = CredentialsPermissionChecker;
exports.CredentialsPermissionChecker = CredentialsPermissionChecker = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.SharedCredentialsRepository,
			ownership_service_1.OwnershipService,
			project_service_ee_1.ProjectService,
		]),
	],
	CredentialsPermissionChecker,
);
//# sourceMappingURL=credentials-permission-checker.js.map
