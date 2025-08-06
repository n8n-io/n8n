import { Logger } from '@n8n/backend-common';
import {
	Get,
	Post,
	Put,
	Delete,
	Query,
	Body,
	Param,
	RestController,
	GlobalScope,
	Licensed,
} from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import { Response } from 'express';
import { ApplicationError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { WorkflowOrganizationService } from '@/services/workflow-organization.service';
import { FolderPermissionsService } from '@/services/folder-permissions.service';
import { EventService } from '@/events/event.service';

@RestController('/folders')
export class FoldersController {
	constructor(
		private readonly workflowOrganizationService: WorkflowOrganizationService,
		private readonly folderPermissionsService: FolderPermissionsService,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	@Post('/')
	@GlobalScope('workflow:create')
	@Licensed('feat:advancedPermissions')
	async createFolder(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			name: string;
			description?: string;
			parentId?: string;
			color?: string;
			icon?: string;
			position?: number;
		},
	): Promise<any> {
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to create folder');
		}
	}

	@Put('/:folderId')
	@GlobalScope('workflow:update')
	@Licensed('feat:advancedPermissions')
	async updateFolder(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
		@Body request: {
			name?: string;
			description?: string;
			color?: string;
			icon?: string;
			position?: number;
		},
	): Promise<any> {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}

			// Check permissions
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to update folder');
		}
	}

	@Delete('/:folderId')
	@GlobalScope('workflow:delete')
	@Licensed('feat:advancedPermissions')
	async deleteFolder(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
		@Query query: { force?: boolean },
	): Promise<any> {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}

			// Check permissions
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to delete folder');
		}
	}

	@Get('/:folderId')
	@GlobalScope('workflow:read')
	async getFolder(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
	): Promise<any> {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}

			// Check permissions
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

			if (error instanceof ApplicationError && error.message.includes('not found')) {
				return res.status(404).json({ error: 'Folder not found' });
			}

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to get folder');
		}
	}

	@Get('/')
	@GlobalScope('workflow:read')
	async getFolderTree(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: { rootId?: string; includeWorkflows?: boolean },
	): Promise<any> {
		try {
			const result = await this.workflowOrganizationService.getFolderTree(req.user, query.rootId);

			// Filter folders based on permissions
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to get folder tree');
		}
	}

	@Post('/search')
	@GlobalScope('workflow:read')
	async searchFolders(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			query?: string;
			parentId?: string;
			includeSubfolders?: boolean;
			includeWorkflows?: boolean;
			tags?: string[];
			workflowStatus?: 'active' | 'inactive' | 'all';
			limit?: number;
			offset?: number;
			sortBy?: 'name' | 'created' | 'updated' | 'workflowCount';
			sortOrder?: 'asc' | 'desc';
		},
	): Promise<any> {
		try {
			const result = await this.workflowOrganizationService.searchFolders(req.user, request);

			// Filter results based on permissions
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to search folders');
		}
	}

	@Post('/:folderId/move')
	@GlobalScope('workflow:update')
	@Licensed('feat:advancedPermissions')
	async moveFolder(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
		@Body request: {
			targetParentId?: string;
			position?: number;
		},
	): Promise<any> {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}

			// Check permissions for source folder
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

			// Check permissions for target folder if specified
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to move folder');
		}
	}

	@Post('/bulk')
	@GlobalScope('workflow:update')
	@Licensed('feat:advancedPermissions')
	async bulkFolderOperation(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			operation: 'move' | 'copy' | 'delete';
			folderIds: string[];
			targetParentId?: string;
		},
	): Promise<any> {
		try {
			if (!request.operation || !request.folderIds?.length) {
				return res.status(400).json({
					error: 'Operation type and folder IDs are required',
				});
			}

			// Check permissions for all folders
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

			// Check target permissions for move/copy operations
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to perform bulk folder operation');
		}
	}

	@Post('/:folderId/permissions/grant')
	@GlobalScope('instance:admin')
	@Licensed('feat:advancedPermissions')
	async grantFolderAccess(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
		@Body request: {
			userIds?: string[];
			teamIds?: string[];
			role: 'owner' | 'editor' | 'viewer';
			permissions?: {
				canRead?: boolean;
				canWrite?: boolean;
				canDelete?: boolean;
				canShare?: boolean;
				canExecute?: boolean;
				canCreateSubfolders?: boolean;
			};
			expiresAt?: Date;
			inheritToChildren?: boolean;
		},
	): Promise<any> {
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to grant folder access');
		}
	}

	@Delete('/:folderId/permissions')
	@GlobalScope('instance:admin')
	@Licensed('feat:advancedPermissions')
	async revokeFolderAccess(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
		@Body request: {
			recipientIds: string[];
		},
	): Promise<any> {
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to revoke folder access');
		}
	}

	@Get('/:folderId/permissions')
	@GlobalScope('workflow:read')
	async getFolderPermissions(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
	): Promise<any> {
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

			if (error instanceof ApplicationError && error.message.includes('not found')) {
				return res.status(404).json({ error: 'Folder not found' });
			}

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to get folder permissions');
		}
	}

	@Post('/:folderId/share')
	@GlobalScope('workflow:share')
	@Licensed('feat:advancedPermissions')
	async shareFolder(
		req: AuthenticatedRequest,
		res: Response,
		@Param('folderId') folderId: string,
		@Body request: {
			recipientType: 'user' | 'team' | 'public' | 'link';
			recipientIds?: string[];
			role: 'editor' | 'viewer';
			expiresAt?: Date;
			allowCopy?: boolean;
			allowDownload?: boolean;
			requirePassword?: boolean;
			password?: string;
		},
	): Promise<any> {
		try {
			if (!folderId) {
				return res.status(400).json({
					error: 'Folder ID is required',
				});
			}

			// Check permissions
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to share folder');
		}
	}

	@Post('/permissions/bulk')
	@GlobalScope('instance:admin')
	@Licensed('feat:advancedPermissions')
	async bulkUpdatePermissions(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			operation: 'grant' | 'revoke' | 'update';
			folderIds: string[];
			userIds?: string[];
			teamIds?: string[];
			role?: 'owner' | 'editor' | 'viewer';
			permissions?: {
				canRead?: boolean;
				canWrite?: boolean;
				canDelete?: boolean;
				canShare?: boolean;
				canExecute?: boolean;
				canCreateSubfolders?: boolean;
			};
			inheritToChildren?: boolean;
		},
	): Promise<any> {
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to bulk update folder permissions');
		}
	}

	@Get('/audit/access-log')
	@GlobalScope('instance:admin')
	async getAccessAuditLog(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: { folderId?: string; limit?: number },
	): Promise<any> {
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to get access audit log');
		}
	}

	@Post('/export')
	@GlobalScope('workflow:read')
	@Licensed('feat:advancedPermissions')
	async exportFolders(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			folderIds: string[];
			includeSubfolders?: boolean;
			includeWorkflows?: boolean;
			exportFormat?: 'json' | 'csv' | 'zip';
			compression?: boolean;
		},
	): Promise<any> {
		try {
			if (!request.folderIds?.length) {
				return res.status(400).json({
					error: 'At least one folder ID is required',
				});
			}

			// Check permissions for all folders
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

			// Set appropriate response headers based on format
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to export folders');
		}
	}

	@Post('/import')
	@GlobalScope('workflow:create')
	@Licensed('feat:advancedPermissions')
	async importFolders(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			importData: any;
			targetParentId?: string;
			conflictResolution?: 'skip' | 'overwrite' | 'rename';
			preserveIds?: boolean;
		},
	): Promise<any> {
		try {
			if (!request.importData) {
				return res.status(400).json({
					error: 'Import data is required',
				});
			}

			// Check permissions for target parent folder if specified
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

			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}

			throw new InternalServerError('Failed to import folders');
		}
	}

	// Private helper methods
	private async filterFoldersByPermissions(user: any, folders: any[]): Promise<any[]> {
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
				// Skip folder if permission check fails
				this.logger.debug('Permission check failed for folder', {
					userId: user.id,
					folderId: folder.id,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		return filteredFolders;
	}

	private async filterWorkflowsByPermissions(user: any, workflows: any[]): Promise<any[]> {
		// For now, return all workflows - would need to integrate with workflow permissions
		return workflows;
	}
}
