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
exports.FoldersController = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const workflow_organization_service_1 = require('@/services/workflow-organization.service');
const folder_permissions_service_1 = require('@/services/folder-permissions.service');
const event_service_1 = require('@/events/event.service');
let FoldersController = class FoldersController {
	constructor(workflowOrganizationService, folderPermissionsService, eventService, logger) {
		this.workflowOrganizationService = workflowOrganizationService;
		this.folderPermissionsService = folderPermissionsService;
		this.eventService = eventService;
		this.logger = logger;
	}
	async createFolder(req, res, request) {
		try {
			if (!request.name?.trim()) {
				return res.status(400).json({
					error: 'Folder name is required',
				});
			}
			const result = await this.workflowOrganizationService.createFolder(req.user, request);
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to create folder', {
				userId: req.user?.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to create folder');
		}
	}
	async updateFolder(req, res, folderId, request) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
				req.user,
				folderId,
				'write',
			);
			if (!permissionCheck.allowed) {
				return res.status(403).json({
					error: permissionCheck.reason || 'Access denied',
				});
			}
			const result = await this.workflowOrganizationService.updateFolder(
				req.user,
				folderId,
				request,
			);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to update folder', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to update folder');
		}
	}
	async deleteFolder(req, res, folderId, query) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
				req.user,
				folderId,
				'delete',
			);
			if (!permissionCheck.allowed) {
				return res.status(403).json({
					error: permissionCheck.reason || 'Access denied',
				});
			}
			const result = await this.workflowOrganizationService.deleteFolder(
				req.user,
				folderId,
				query.force === true,
			);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to delete folder', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to delete folder');
		}
	}
	async getFolder(req, res, folderId) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
				req.user,
				folderId,
				'read',
			);
			if (!permissionCheck.allowed) {
				return res.status(403).json({
					error: permissionCheck.reason || 'Access denied',
				});
			}
			const result = await this.workflowOrganizationService.getFolderById(req.user, folderId);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to get folder', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (error instanceof n8n_workflow_1.ApplicationError && error.message.includes('not found')) {
				return res.status(404).json({ error: 'Folder not found' });
			}
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to get folder');
		}
	}
	async getFolderTree(req, res, query) {
		try {
			const result = await this.workflowOrganizationService.getFolderTree(req.user, query.rootId);
			const filteredResult = await this.filterFoldersByPermissions(req.user, result);
			return res.status(200).json({
				success: true,
				data: {
					folders: filteredResult,
					total: filteredResult.length,
				},
			});
		} catch (error) {
			this.logger.error('Failed to get folder tree', {
				userId: req.user?.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to get folder tree');
		}
	}
	async searchFolders(req, res, request) {
		try {
			const result = await this.workflowOrganizationService.searchFolders(req.user, request);
			const filteredFolders = await this.filterFoldersByPermissions(req.user, result.folders);
			const filteredWorkflows = await this.filterWorkflowsByPermissions(req.user, result.workflows);
			return res.status(200).json({
				success: true,
				data: {
					...result,
					folders: filteredFolders,
					workflows: filteredWorkflows,
					folderCount: filteredFolders.length,
					workflowCount: filteredWorkflows.length,
				},
			});
		} catch (error) {
			this.logger.error('Failed to search folders', {
				userId: req.user?.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to search folders');
		}
	}
	async moveFolder(req, res, folderId, request) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			const sourcePermissionCheck = await this.folderPermissionsService.checkFolderPermission(
				req.user,
				folderId,
				'write',
			);
			if (!sourcePermissionCheck.allowed) {
				return res.status(403).json({
					error: 'Access denied: Cannot move folder',
				});
			}
			if (request.targetParentId) {
				const targetPermissionCheck = await this.folderPermissionsService.checkFolderPermission(
					req.user,
					request.targetParentId,
					'write',
				);
				if (!targetPermissionCheck.allowed) {
					return res.status(403).json({
						error: 'Access denied: Cannot move to target folder',
					});
				}
			}
			const result = await this.workflowOrganizationService.moveFolder(req.user, {
				folderId,
				targetParentId: request.targetParentId,
				position: request.position,
			});
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to move folder', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to move folder');
		}
	}
	async bulkFolderOperation(req, res, request) {
		try {
			if (!request.operation || !request.folderIds?.length) {
				return res.status(400).json({
					error: 'Operation type and folder IDs are required',
				});
			}
			for (const folderId of request.folderIds) {
				const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
					req.user,
					folderId,
					request.operation === 'delete' ? 'delete' : 'write',
				);
				if (!permissionCheck.allowed) {
					return res.status(403).json({
						error: `Access denied for folder: ${folderId}`,
					});
				}
			}
			if (
				(request.operation === 'move' || request.operation === 'copy') &&
				request.targetParentId
			) {
				const targetPermissionCheck = await this.folderPermissionsService.checkFolderPermission(
					req.user,
					request.targetParentId,
					'write',
				);
				if (!targetPermissionCheck.allowed) {
					return res.status(403).json({
						error: 'Access denied: Cannot modify target folder',
					});
				}
			}
			const result = await this.workflowOrganizationService.bulkFolderOperation(req.user, request);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to perform bulk folder operation', {
				userId: req.user?.id,
				operation: request.operation,
				folderIds: request.folderIds?.length,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to perform bulk folder operation',
			);
		}
	}
	async grantFolderAccess(req, res, folderId, request) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			if (!request.userIds?.length && !request.teamIds?.length) {
				return res.status(400).json({
					error: 'At least one user or team ID is required',
				});
			}
			const result = await this.folderPermissionsService.grantFolderAccess(req.user, {
				folderId,
				userIds: request.userIds,
				teamIds: request.teamIds,
				role: request.role,
				permissions: request.permissions,
				expiresAt: request.expiresAt,
				inheritToChildren: request.inheritToChildren,
			});
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to grant folder access', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to grant folder access');
		}
	}
	async revokeFolderAccess(req, res, folderId, request) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			if (!request.recipientIds?.length) {
				return res.status(400).json({
					error: 'Recipient IDs are required',
				});
			}
			const result = await this.folderPermissionsService.revokeFolderAccess(
				req.user,
				folderId,
				request.recipientIds,
			);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to revoke folder access', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to revoke folder access');
		}
	}
	async getFolderPermissions(req, res, folderId) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			const result = await this.folderPermissionsService.getFolderPermissions(req.user, folderId);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to get folder permissions', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (error instanceof n8n_workflow_1.ApplicationError && error.message.includes('not found')) {
				return res.status(404).json({ error: 'Folder not found' });
			}
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to get folder permissions');
		}
	}
	async shareFolder(req, res, folderId, request) {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}
			const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
				req.user,
				folderId,
				'share',
			);
			if (!permissionCheck.allowed) {
				return res.status(403).json({
					error: permissionCheck.reason || 'Access denied',
				});
			}
			const result = await this.folderPermissionsService.shareFolderPublicly(req.user, {
				folderId,
				recipientType: request.recipientType,
				recipientIds: request.recipientIds,
				role: request.role,
				expiresAt: request.expiresAt,
				allowCopy: request.allowCopy,
				allowDownload: request.allowDownload,
				requirePassword: request.requirePassword,
				password: request.password,
			});
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to share folder', {
				userId: req.user?.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to share folder');
		}
	}
	async bulkUpdatePermissions(req, res, request) {
		try {
			if (!request.operation || !request.folderIds?.length) {
				return res.status(400).json({
					error: 'Operation type and folder IDs are required',
				});
			}
			const result = await this.folderPermissionsService.bulkUpdatePermissions(req.user, request);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to bulk update folder permissions', {
				userId: req.user?.id,
				operation: request.operation,
				folderCount: request.folderIds?.length,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError(
				'Failed to bulk update folder permissions',
			);
		}
	}
	async getAccessAuditLog(req, res, query) {
		try {
			const limit = query.limit ? Math.min(parseInt(query.limit.toString(), 10), 1000) : 100;
			const result = await this.folderPermissionsService.getAccessAuditLog(
				req.user,
				query.folderId,
				limit,
			);
			return res.status(200).json({
				success: true,
				data: {
					auditLog: result,
					total: result.length,
				},
			});
		} catch (error) {
			this.logger.error('Failed to get access audit log', {
				userId: req.user?.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to get access audit log');
		}
	}
	async exportFolders(req, res, request) {
		try {
			if (!request.folderIds?.length) {
				return res.status(400).json({
					error: 'At least one folder ID is required',
				});
			}
			for (const folderId of request.folderIds) {
				const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
					req.user,
					folderId,
					'read',
				);
				if (!permissionCheck.allowed) {
					return res.status(403).json({
						error: `Access denied for folder: ${folderId}`,
					});
				}
			}
			const result = await this.workflowOrganizationService.exportFolders(req.user, {
				folderIds: request.folderIds,
				includeSubfolders: request.includeSubfolders,
				includeWorkflows: request.includeWorkflows,
				exportFormat: request.exportFormat || 'json',
				compression: request.compression,
			});
			switch (result.format) {
				case 'json':
					res.setHeader('Content-Type', 'application/json');
					break;
				case 'csv':
					res.setHeader('Content-Type', 'text/csv');
					res.setHeader('Content-Disposition', 'attachment; filename="folders-export.csv"');
					break;
				case 'zip':
					res.setHeader('Content-Type', 'application/zip');
					res.setHeader('Content-Disposition', 'attachment; filename="folders-export.zip"');
					break;
			}
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to export folders', {
				userId: req.user?.id,
				folderIds: request.folderIds?.length,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to export folders');
		}
	}
	async importFolders(req, res, request) {
		try {
			if (!request.importData) {
				return res.status(400).json({
					error: 'Import data is required',
				});
			}
			if (request.targetParentId) {
				const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
					req.user,
					request.targetParentId,
					'create_subfolder',
				);
				if (!permissionCheck.allowed) {
					return res.status(403).json({
						error: 'Access denied: Cannot create folders in target location',
					});
				}
			}
			const result = await this.workflowOrganizationService.importFolders(req.user, {
				importData: request.importData,
				targetParentId: request.targetParentId,
				conflictResolution: request.conflictResolution || 'rename',
				preserveIds: request.preserveIds || false,
			});
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			this.logger.error('Failed to import folders', {
				userId: req.user?.id,
				targetParentId: request.targetParentId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to import folders');
		}
	}
	async filterFoldersByPermissions(user, folders) {
		const filteredFolders = [];
		for (const folder of folders) {
			try {
				const permissionCheck = await this.folderPermissionsService.checkFolderPermission(
					user,
					folder.id,
					'read',
				);
				if (permissionCheck.allowed) {
					filteredFolders.push(folder);
				}
			} catch (error) {
				this.logger.debug('Permission check failed for folder', {
					userId: user.id,
					folderId: folder.id,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return filteredFolders;
	}
	async filterWorkflowsByPermissions(user, workflows) {
		return workflows;
	}
};
exports.FoldersController = FoldersController;
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('workflow:create'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'createFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/:folderId'),
		(0, decorators_1.GlobalScope)('workflow:update'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'updateFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:folderId'),
		(0, decorators_1.GlobalScope)('workflow:delete'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'deleteFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId'),
		(0, decorators_1.GlobalScope)('workflow:read'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'getFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('workflow:read'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'getFolderTree',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/search'),
		(0, decorators_1.GlobalScope)('workflow:read'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'searchFolders',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:folderId/move'),
		(0, decorators_1.GlobalScope)('workflow:update'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'moveFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk'),
		(0, decorators_1.GlobalScope)('workflow:update'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'bulkFolderOperation',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:folderId/permissions/grant'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'grantFolderAccess',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:folderId/permissions'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'revokeFolderAccess',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:folderId/permissions'),
		(0, decorators_1.GlobalScope)('workflow:read'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'getFolderPermissions',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:folderId/share'),
		(0, decorators_1.GlobalScope)('workflow:share'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, (0, decorators_1.Param)('folderId')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'shareFolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/permissions/bulk'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'bulkUpdatePermissions',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/audit/access-log'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'getAccessAuditLog',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/export'),
		(0, decorators_1.GlobalScope)('workflow:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'exportFolders',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/import'),
		(0, decorators_1.GlobalScope)('workflow:create'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	FoldersController.prototype,
	'importFolders',
	null,
);
exports.FoldersController = FoldersController = __decorate(
	[
		(0, decorators_1.RestController)('/folders'),
		__metadata('design:paramtypes', [
			workflow_organization_service_1.WorkflowOrganizationService,
			folder_permissions_service_1.FolderPermissionsService,
			event_service_1.EventService,
			backend_common_1.Logger,
		]),
	],
	FoldersController,
);
//# sourceMappingURL=folders.controller.js.map
