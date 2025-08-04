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
exports.WorkflowFinderService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
let WorkflowFinderService = class WorkflowFinderService {
	constructor(sharedWorkflowRepository, folderRepository) {
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.folderRepository = folderRepository;
	}
	async findWorkflowForUser(workflowId, user, scopes, options = {}) {
		let where = {};
		if (!(0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) {
			const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
			const workflowRoles = (0, permissions_1.rolesWithScope)('workflow', scopes);
			where = {
				role: (0, typeorm_1.In)(workflowRoles),
				project: {
					projectRelations: {
						role: (0, typeorm_1.In)(projectRoles),
						userId: user.id,
					},
				},
			};
		}
		const sharedWorkflow = await this.sharedWorkflowRepository.findWorkflowWithOptions(workflowId, {
			where,
			includeTags: options.includeTags,
			includeParentFolder: options.includeParentFolder,
			em: options.em,
		});
		if (!sharedWorkflow) {
			return null;
		}
		return sharedWorkflow.workflow;
	}
	async findAllWorkflowsForUser(user, scopes, folderId, projectId) {
		let where = {};
		if (folderId) {
			const subFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
				folderId,
				projectId,
			);
			where = {
				...where,
				workflow: {
					parentFolder: (0, typeorm_1.In)([folderId, ...subFolderIds]),
				},
			};
		}
		if (!(0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) {
			const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
			const workflowRoles = (0, permissions_1.rolesWithScope)('workflow', scopes);
			where = {
				...where,
				role: (0, typeorm_1.In)(workflowRoles),
				project: {
					...(projectId && { id: projectId }),
					projectRelations: {
						role: (0, typeorm_1.In)(projectRoles),
						userId: user.id,
					},
				},
			};
		}
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where,
			relations: {
				workflow: {
					shared: { project: { projectRelations: { user: true } } },
				},
			},
		});
		return sharedWorkflows.map((sw) => ({ ...sw.workflow, projectId: sw.projectId }));
	}
};
exports.WorkflowFinderService = WorkflowFinderService;
exports.WorkflowFinderService = WorkflowFinderService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.SharedWorkflowRepository, db_1.FolderRepository]),
	],
	WorkflowFinderService,
);
//# sourceMappingURL=workflow-finder.service.js.map
