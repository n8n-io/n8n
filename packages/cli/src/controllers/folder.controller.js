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
exports.ProjectController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const n8n_workflow_1 = require('n8n-workflow');
const folder_not_found_error_1 = require('@/errors/folder-not-found.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const folder_service_1 = require('@/services/folder.service');
const workflow_service_ee_1 = require('@/workflows/workflow.service.ee');
let ProjectController = class ProjectController {
	constructor(folderService, enterpriseWorkflowService) {
		this.folderService = folderService;
		this.enterpriseWorkflowService = enterpriseWorkflowService;
	}
	async createFolder(req, _res, payload) {
		try {
			const folder = await this.folderService.createFolder(payload, req.params.projectId);
			return folder;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderTree(req, _res) {
		const { projectId, folderId } = req.params;
		try {
			const tree = await this.folderService.getFolderTree(folderId, projectId);
			return tree;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderUsedCredentials(req, _res) {
		const { projectId, folderId } = req.params;
		try {
			const credentials = await this.enterpriseWorkflowService.getFolderUsedCredentials(
				req.user,
				folderId,
				projectId,
			);
			return credentials;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async updateFolder(req, _res, payload) {
		const { projectId, folderId } = req.params;
		try {
			await this.folderService.updateFolder(folderId, projectId, payload);
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			} else if (e instanceof n8n_workflow_1.UserError) {
				throw new bad_request_error_1.BadRequestError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async deleteFolder(req, _res, payload) {
		const { projectId, folderId } = req.params;
		try {
			await this.folderService.deleteFolder(req.user, folderId, projectId, payload);
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			} else if (e instanceof n8n_workflow_1.UserError) {
				throw new bad_request_error_1.BadRequestError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async listFolders(req, res, payload) {
		const { projectId } = req.params;
		const [data, count] = await this.folderService.getManyAndCount(projectId, payload);
		res.json({ count, data });
	}
	async getFolderContent(req) {
		const { projectId, folderId } = req.params;
		try {
			const { totalSubFolders, totalWorkflows } =
				await this.folderService.getFolderAndWorkflowCount(folderId, projectId);
			return {
				totalSubFolders,
				totalWorkflows,
			};
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async transferFolderToProject(req, _res, sourceFolderId, sourceProjectId, body) {
		return await this.enterpriseWorkflowService.transferFolder(
			req.user,
			sourceProjectId,
			sourceFolderId,
			body.destinationProjectId,
			body.destinationParentFolderId,
			body.shareCredentials,
		);
	}
	async getFolder(req) {
		const { projectId, folderId } = req.params;
		try {
			const folder = await this.folderService.findFolderInProjectOrFail(folderId, projectId);
			return folder;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderPath(req) {
		const { projectId, folderId } = req.params;
		try {
			const path = await this.folderService.getFolderPath(folderId, projectId);
			return { path };
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderAncestors(req) {
		const { projectId, folderId } = req.params;
		try {
			const ancestors = await this.folderService.getFolderAncestors(folderId, projectId);
			return { ancestors };
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderDescendants(req) {
		const { projectId, folderId } = req.params;
		try {
			const descendants = await this.folderService.getFolderDescendants(folderId, projectId);
			return { descendants };
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async duplicateFolder(req, _res, payload) {
		const { projectId, folderId } = req.params;
		const { name, parentFolderId, includeWorkflows = false } = payload;
		try {
			const duplicatedFolder = await this.folderService.duplicateFolder(folderId, projectId, {
				name,
				parentFolderId,
				includeWorkflows,
			});
			return duplicatedFolder;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			} else if (e instanceof n8n_workflow_1.UserError) {
				throw new bad_request_error_1.BadRequestError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async bulkMoveFolders(req, _res, payload) {
		const { projectId } = req.params;
		const { folderIds, targetFolderId } = payload;
		if (!folderIds || folderIds.length === 0) {
			throw new bad_request_error_1.BadRequestError('folderIds is required and cannot be empty');
		}
		if (folderIds.length > 50) {
			throw new bad_request_error_1.BadRequestError('Cannot move more than 50 folders at once');
		}
		try {
			const result = await this.folderService.bulkMoveFolders(folderIds, projectId, targetFolderId);
			return result;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			} else if (e instanceof n8n_workflow_1.UserError) {
				throw new bad_request_error_1.BadRequestError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async bulkDeleteFolders(req, _res, payload) {
		const { projectId } = req.params;
		const { folderIds, transferToFolderId } = payload;
		if (!folderIds || folderIds.length === 0) {
			throw new bad_request_error_1.BadRequestError('folderIds is required and cannot be empty');
		}
		if (folderIds.length > 50) {
			throw new bad_request_error_1.BadRequestError('Cannot delete more than 50 folders at once');
		}
		try {
			const result = await this.folderService.bulkDeleteFolders(
				req.user,
				folderIds,
				projectId,
				transferToFolderId,
			);
			return result;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			} else if (e instanceof n8n_workflow_1.UserError) {
				throw new bad_request_error_1.BadRequestError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderPermissions(req) {
		const { projectId, folderId } = req.params;
		try {
			const permissions = await this.folderService.getFolderPermissions(
				req.user,
				folderId,
				projectId,
			);
			return { permissions };
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
	async getFolderStatistics(req) {
		const { projectId, folderId } = req.params;
		try {
			const statistics = await this.folderService.getFolderStatistics(folderId, projectId);
			return statistics;
		} catch (e) {
			if (e instanceof folder_not_found_error_1.FolderNotFoundError) {
				throw new not_found_error_1.NotFoundError(e.message);
			}
			throw new internal_server_error_1.InternalServerError(undefined, e);
		}
	}
};
exports.ProjectController = ProjectController;
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.ProjectScope)('folder:create'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.CreateFolderDto]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'createFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/tree'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderTree',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/credentials'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderUsedCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:folderId'),
		(0, decorators_1.ProjectScope)('folder:update'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.UpdateFolderDto]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'updateFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:folderId'),
		(0, decorators_1.ProjectScope)('folder:delete'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.DeleteFolderDto]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'deleteFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.ProjectScope)('folder:list'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.ListFolderQueryDto]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'listFolders',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/content'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderContent',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/:folderId/transfer'),
		(0, decorators_1.ProjectScope)('folder:move'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, (0, decorators_1.Param)('projectId')),
		__param(4, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			String,
			api_types_1.TransferFolderBodyDto,
		]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'transferFolderToProject',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/path'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderPath',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/ancestors'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderAncestors',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/descendants'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderDescendants',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:folderId/duplicate'),
		(0, decorators_1.ProjectScope)('folder:create'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'duplicateFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/move'),
		(0, decorators_1.ProjectScope)('folder:update'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'bulkMoveFolders',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/delete'),
		(0, decorators_1.ProjectScope)('folder:delete'),
		(0, decorators_1.Licensed)('feat:folders'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'bulkDeleteFolders',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/permissions'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderPermissions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/statistics'),
		(0, decorators_1.ProjectScope)('folder:read'),
		(0, decorators_1.Licensed)('feat:folders'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getFolderStatistics',
	null,
);
exports.ProjectController = ProjectController = __decorate(
	[
		(0, decorators_1.RestController)('/projects/:projectId/folders'),
		__metadata('design:paramtypes', [
			folder_service_1.FolderService,
			workflow_service_ee_1.EnterpriseWorkflowService,
		]),
	],
	ProjectController,
);
//# sourceMappingURL=folder.controller.js.map
