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
var _a;
Object.defineProperty(exports, '__esModule', { value: true });
exports.FolderPermissionsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const typeorm_1 = require('typeorm');
const event_service_1 = require('@/events/event.service');
let FolderPermissionsService = class FolderPermissionsService {
	constructor(dataSource, eventService, logger) {
		this.dataSource = dataSource;
		this.eventService = eventService;
		this.logger = logger;
		this.auditLog = [];
		this.maxAuditEntries = 10000;
	}
	async grantFolderAccess(user, request) {
		try {
			this.logger.info('Granting folder access', {
				userId: user.id,
				folderId: request.folderId,
				userIds: request.userIds?.length || 0,
				teamIds: request.teamIds?.length || 0,
				role: request.role,
			});
			await this.validateFolderOwnership(user, request.folderId);
			let grantedPermissions = 0;
			const errors = [];
			if (request.userIds?.length) {
				for (const userId of request.userIds) {
					try {
						await this.grantUserFolderPermission(
							request.folderId,
							userId,
							request.role,
							request.permissions,
							user.id,
							request.expiresAt,
						);
						if (request.inheritToChildren) {
							await this.propagatePermissionsToChildren(request.folderId, userId, request.role);
						}
						grantedPermissions++;
					} catch (error) {
						errors.push({
							recipientId: userId,
							error: error instanceof Error ? error.message : 'Unknown error',
						});
					}
				}
			}
			if (request.teamIds?.length) {
				for (const teamId of request.teamIds) {
					try {
						await this.grantTeamFolderPermission(
							request.folderId,
							teamId,
							request.role,
							request.permissions,
							user.id,
							request.expiresAt,
						);
						if (request.inheritToChildren) {
							await this.propagateTeamPermissionsToChildren(request.folderId, teamId, request.role);
						}
						grantedPermissions++;
					} catch (error) {
						errors.push({
							recipientId: teamId,
							error: error instanceof Error ? error.message : 'Unknown error',
						});
					}
				}
			}
			this.eventService.emit('folder-access-granted', {
				userId: user.id,
				folderId: request.folderId,
				recipientCount: grantedPermissions,
				role: request.role,
			});
			this.logger.info('Folder access granted', {
				userId: user.id,
				folderId: request.folderId,
				grantedPermissions,
				errors: errors.length,
			});
			return {
				success: errors.length === 0,
				grantedPermissions,
				errors,
			};
		} catch (error) {
			this.logger.error('Failed to grant folder access', {
				userId: user.id,
				folderId: request.folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async revokeFolderAccess(user, folderId, recipientIds) {
		try {
			this.logger.info('Revoking folder access', {
				userId: user.id,
				folderId,
				recipientCount: recipientIds.length,
			});
			await this.validateFolderOwnership(user, folderId);
			let revokedPermissions = 0;
			const errors = [];
			for (const recipientId of recipientIds) {
				try {
					await this.dataSource.transaction(async (manager) => {
						await manager.query(
							`
							DELETE FROM folder_permissions 
							WHERE folder_id = ? AND (user_id = ? OR team_id = ?)
						`,
							[folderId, recipientId, recipientId],
						);
						await manager.query(
							`
							DELETE FROM folder_permissions 
							WHERE folder_id IN (
								SELECT id FROM workflow_folders 
								WHERE path LIKE (SELECT CONCAT(path, '/%') FROM workflow_folders WHERE id = ?)
							) 
							AND (user_id = ? OR team_id = ?) 
							AND inherited = true
						`,
							[folderId, recipientId, recipientId],
						);
					});
					revokedPermissions++;
				} catch (error) {
					errors.push({
						recipientId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
			this.eventService.emit('folder-access-revoked', {
				userId: user.id,
				folderId,
				revokedPermissions,
			});
			this.logger.info('Folder access revoked', {
				userId: user.id,
				folderId,
				revokedPermissions,
				errors: errors.length,
			});
			return {
				success: errors.length === 0,
				revokedPermissions,
				errors,
			};
		} catch (error) {
			this.logger.error('Failed to revoke folder access', {
				userId: user.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async shareFolderPublicly(user, request) {
		try {
			this.logger.info('Creating public folder share', {
				userId: user.id,
				folderId: request.folderId,
				recipientType: request.recipientType,
				role: request.role,
			});
			await this.validateFolderOwnership(user, request.folderId);
			const shareId = this.generateShareId();
			const shareUrl = this.generateShareUrl(shareId);
			await this.dataSource.transaction(async (manager) => {
				const shareData = {
					id: shareId,
					folderId: request.folderId,
					recipientType: request.recipientType,
					role: request.role,
					createdBy: user.id,
					createdAt: new Date(),
					expiresAt: request.expiresAt,
					allowCopy: request.allowCopy || false,
					allowDownload: request.allowDownload || false,
					requirePassword: request.requirePassword || false,
					passwordHash: request.password ? await this.hashPassword(request.password) : null,
					url: shareUrl,
					isActive: true,
				};
				await manager.query(
					`
					INSERT INTO folder_shares 
					(id, folder_id, recipient_type, role, created_by, created_at, expires_at, allow_copy, allow_download, require_password, password_hash, url, is_active)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
					[
						shareData.id,
						shareData.folderId,
						shareData.recipientType,
						shareData.role,
						shareData.createdBy,
						shareData.createdAt,
						shareData.expiresAt,
						shareData.allowCopy,
						shareData.allowDownload,
						shareData.requirePassword,
						shareData.passwordHash,
						shareData.url,
						shareData.isActive,
					],
				);
			});
			this.eventService.emit('folder-shared-publicly', {
				userId: user.id,
				folderId: request.folderId,
				shareId,
				recipientType: request.recipientType,
			});
			this.logger.info('Public folder share created', {
				userId: user.id,
				folderId: request.folderId,
				shareId,
			});
			return {
				shareId,
				shareUrl,
				expiresAt: request.expiresAt,
			};
		} catch (error) {
			this.logger.error('Failed to create public folder share', {
				userId: user.id,
				folderId: request.folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async checkFolderPermission(user, folderId, action) {
		try {
			const directPermission = await this.getUserFolderPermission(user.id, folderId);
			const inheritedPermission = await this.getInheritedFolderPermission(user.id, folderId);
			const effectivePermission = directPermission || inheritedPermission;
			if (!effectivePermission) {
				await this.logAuditEntry({
					folderId,
					userId: user.id,
					action,
					timestamp: new Date(),
					result: 'denied',
					reason: 'No permissions found',
				});
				return {
					allowed: false,
					reason: 'Access denied: No permissions for this folder',
				};
			}
			const allowed = this.hasPermissionForAction(effectivePermission.permissions, action);
			await this.logAuditEntry({
				folderId,
				userId: user.id,
				action,
				timestamp: new Date(),
				result: allowed ? 'allowed' : 'denied',
				reason: allowed ? undefined : `Insufficient permissions for action: ${action}`,
			});
			return {
				allowed,
				reason: allowed ? undefined : `Access denied: Insufficient permissions for ${action}`,
				inheritedFrom:
					effectivePermission.inherited && !directPermission
						? inheritedPermission?.folderId
						: undefined,
			};
		} catch (error) {
			this.logger.error('Failed to check folder permission', {
				userId: user.id,
				folderId,
				action,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return {
				allowed: false,
				reason: 'Permission check failed',
			};
		}
	}
	async getFolderPermissions(user, folderId) {
		try {
			this.logger.info('Getting folder permissions', {
				userId: user.id,
				folderId,
			});
			const folderInfo = await this.dataSource.query(
				`
				SELECT id, name, path FROM workflow_folders WHERE id = ?
			`,
				[folderId],
			);
			if (folderInfo.length === 0) {
				throw new n8n_workflow_1.ApplicationError(`Folder not found: ${folderId}`);
			}
			const folder = folderInfo[0];
			const userPermission = await this.getUserFolderPermission(user.id, folderId);
			const effectivePermissions = await this.getEffectiveFolderPermissions(user.id, folderId);
			const sharedWith = await this.getFolderShares(folderId);
			const inheritanceChain = await this.getPermissionInheritanceChain(user.id, folderId);
			const summary = {
				folderId,
				folderName: folder.name,
				folderPath: folder.path,
				userPermission,
				effectivePermissions,
				sharedWith,
				inheritanceChain,
			};
			return summary;
		} catch (error) {
			this.logger.error('Failed to get folder permissions', {
				userId: user.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async bulkUpdatePermissions(user, request) {
		try {
			this.logger.info('Bulk updating folder permissions', {
				userId: user.id,
				operation: request.operation,
				folderCount: request.folderIds.length,
			});
			let processedFolders = 0;
			const errors = [];
			for (const folderId of request.folderIds) {
				try {
					await this.validateFolderOwnership(user, folderId);
					switch (request.operation) {
						case 'grant':
							if (request.userIds?.length) {
								for (const userId of request.userIds) {
									await this.grantUserFolderPermission(
										folderId,
										userId,
										request.role || 'viewer',
										request.permissions,
										user.id,
									);
								}
							}
							if (request.teamIds?.length) {
								for (const teamId of request.teamIds) {
									await this.grantTeamFolderPermission(
										folderId,
										teamId,
										request.role || 'viewer',
										request.permissions,
										user.id,
									);
								}
							}
							break;
						case 'revoke':
							const recipientIds = [...(request.userIds || []), ...(request.teamIds || [])];
							await this.dataSource.query(
								`
								DELETE FROM folder_permissions 
								WHERE folder_id = ? AND (user_id IN (${recipientIds.map(() => '?').join(',')}) OR team_id IN (${recipientIds.map(() => '?').join(',')}))
							`,
								[folderId, ...recipientIds, ...recipientIds],
							);
							break;
						case 'update':
							if (request.permissions) {
								await this.updateFolderPermissions(folderId, request.permissions);
							}
							break;
					}
					if (request.inheritToChildren) {
						await this.propagateBulkPermissionsToChildren(folderId, request);
					}
					processedFolders++;
				} catch (error) {
					errors.push({
						folderId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
			this.eventService.emit('bulk-folder-permissions-updated', {
				userId: user.id,
				operation: request.operation,
				processedFolders,
				errors: errors.length,
			});
			this.logger.info('Bulk folder permissions update completed', {
				userId: user.id,
				operation: request.operation,
				processedFolders,
				errors: errors.length,
			});
			return {
				success: errors.length === 0,
				processedFolders,
				errors,
			};
		} catch (error) {
			this.logger.error('Failed to bulk update folder permissions', {
				userId: user.id,
				operation: request.operation,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async getAccessAuditLog(user, folderId, limit = 100) {
		try {
			this.logger.info('Getting access audit log', {
				userId: user.id,
				folderId,
				limit,
			});
			let auditEntries = this.auditLog;
			if (folderId) {
				auditEntries = auditEntries.filter((entry) => entry.folderId === folderId);
			}
			return auditEntries
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
				.slice(0, limit);
		} catch (error) {
			this.logger.error('Failed to get access audit log', {
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async validateFolderOwnership(user, folderId) {
		const permission = await this.getUserFolderPermission(user.id, folderId);
		if (!permission || (permission.role !== 'owner' && !permission.permissions.canShare)) {
			throw new n8n_workflow_1.ApplicationError('Insufficient permissions to manage folder access');
		}
	}
	async grantUserFolderPermission(folderId, userId, role, customPermissions, grantedBy, expiresAt) {
		const permissions = this.getRolePermissions(role, customPermissions);
		await this.dataSource.query(
			`
			INSERT OR REPLACE INTO folder_permissions 
			(folder_id, user_id, role, can_read, can_write, can_delete, can_share, can_execute, can_create_subfolders, inherited, granted_at, granted_by, expires_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			[
				folderId,
				userId,
				role,
				permissions.canRead,
				permissions.canWrite,
				permissions.canDelete,
				permissions.canShare,
				permissions.canExecute,
				permissions.canCreateSubfolders,
				false,
				new Date(),
				grantedBy,
				expiresAt,
			],
		);
	}
	async grantTeamFolderPermission(folderId, teamId, role, customPermissions, grantedBy, expiresAt) {
		const permissions = this.getRolePermissions(role, customPermissions);
		await this.dataSource.query(
			`
			INSERT OR REPLACE INTO folder_permissions 
			(folder_id, team_id, role, can_read, can_write, can_delete, can_share, can_execute, can_create_subfolders, inherited, granted_at, granted_by, expires_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			[
				folderId,
				teamId,
				role,
				permissions.canRead,
				permissions.canWrite,
				permissions.canDelete,
				permissions.canShare,
				permissions.canExecute,
				permissions.canCreateSubfolders,
				false,
				new Date(),
				grantedBy,
				expiresAt,
			],
		);
	}
	getRolePermissions(role, customPermissions) {
		const basePermissions = {
			owner: {
				canRead: true,
				canWrite: true,
				canDelete: true,
				canShare: true,
				canExecute: true,
				canCreateSubfolders: true,
			},
			editor: {
				canRead: true,
				canWrite: true,
				canDelete: false,
				canShare: false,
				canExecute: true,
				canCreateSubfolders: true,
			},
			viewer: {
				canRead: true,
				canWrite: false,
				canDelete: false,
				canShare: false,
				canExecute: false,
				canCreateSubfolders: false,
			},
		};
		return {
			...basePermissions[role],
			...customPermissions,
		};
	}
	async getUserFolderPermission(userId, folderId) {
		const result = await this.dataSource.query(
			`
			SELECT * FROM folder_permissions 
			WHERE folder_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > ?)
		`,
			[folderId, userId, new Date()],
		);
		if (result.length === 0) return null;
		const perm = result[0];
		return {
			folderId: perm.folder_id,
			userId: perm.user_id,
			role: perm.role,
			permissions: {
				canRead: perm.can_read,
				canWrite: perm.can_write,
				canDelete: perm.can_delete,
				canShare: perm.can_share,
				canExecute: perm.can_execute,
				canCreateSubfolders: perm.can_create_subfolders,
			},
			inherited: perm.inherited,
			grantedAt: perm.granted_at,
			grantedBy: perm.granted_by,
			expiresAt: perm.expires_at,
		};
	}
	async getInheritedFolderPermission(userId, folderId) {
		const query = `
			SELECT fp.*, wf.path
			FROM folder_permissions fp
			JOIN workflow_folders wf ON fp.folder_id = wf.id
			WHERE fp.user_id = ? 
			AND (fp.expires_at IS NULL OR fp.expires_at > ?)
			AND EXISTS (
				SELECT 1 FROM workflow_folders child
				WHERE child.id = ? AND child.path LIKE CONCAT(wf.path, '/%')
			)
			ORDER BY LENGTH(wf.path) DESC
			LIMIT 1
		`;
		const result = await this.dataSource.query(query, [userId, new Date(), folderId]);
		if (result.length === 0) return null;
		const perm = result[0];
		return {
			folderId: perm.folder_id,
			userId: perm.user_id,
			role: perm.role,
			permissions: {
				canRead: perm.can_read,
				canWrite: perm.can_write,
				canDelete: perm.can_delete,
				canShare: perm.can_share,
				canExecute: perm.can_execute,
				canCreateSubfolders: perm.can_create_subfolders,
			},
			inherited: true,
			grantedAt: perm.granted_at,
			grantedBy: perm.granted_by,
			expiresAt: perm.expires_at,
		};
	}
	async getEffectiveFolderPermissions(userId, folderId) {
		const direct = await this.getUserFolderPermission(userId, folderId);
		const inherited = await this.getInheritedFolderPermission(userId, folderId);
		const effective = direct || inherited;
		return effective
			? effective.permissions
			: {
					canRead: false,
					canWrite: false,
					canDelete: false,
					canShare: false,
					canExecute: false,
					canCreateSubfolders: false,
				};
	}
	hasPermissionForAction(permissions, action) {
		switch (action) {
			case 'read':
				return permissions.canRead;
			case 'write':
				return permissions.canWrite;
			case 'delete':
				return permissions.canDelete;
			case 'share':
				return permissions.canShare;
			case 'execute':
				return permissions.canExecute;
			case 'create_subfolder':
				return permissions.canCreateSubfolders;
			default:
				return false;
		}
	}
	async propagatePermissionsToChildren(folderId, userId, role) {
		const childFolders = await this.dataSource.query(
			`
			SELECT id FROM workflow_folders 
			WHERE path LIKE (SELECT CONCAT(path, '/%') FROM workflow_folders WHERE id = ?)
		`,
			[folderId],
		);
		for (const child of childFolders) {
			await this.grantUserFolderPermission(child.id, userId, role, undefined, 'system');
		}
	}
	async propagateTeamPermissionsToChildren(folderId, teamId, role) {
		const childFolders = await this.dataSource.query(
			`
			SELECT id FROM workflow_folders 
			WHERE path LIKE (SELECT CONCAT(path, '/%') FROM workflow_folders WHERE id = ?)
		`,
			[folderId],
		);
		for (const child of childFolders) {
			await this.grantTeamFolderPermission(child.id, teamId, role, undefined, 'system');
		}
	}
	async propagateBulkPermissionsToChildren(folderId, request) {}
	async updateFolderPermissions(folderId, permissions) {
		const updateFields = [];
		const updateValues = [];
		Object.entries(permissions).forEach(([key, value]) => {
			const dbField = this.convertPermissionKeyToDbField(key);
			if (dbField) {
				updateFields.push(`${dbField} = ?`);
				updateValues.push(value);
			}
		});
		if (updateFields.length > 0) {
			updateValues.push(folderId);
			await this.dataSource.query(
				`
				UPDATE folder_permissions 
				SET ${updateFields.join(', ')}
				WHERE folder_id = ?
			`,
				updateValues,
			);
		}
	}
	convertPermissionKeyToDbField(key) {
		const mapping = {
			canRead: 'can_read',
			canWrite: 'can_write',
			canDelete: 'can_delete',
			canShare: 'can_share',
			canExecute: 'can_execute',
			canCreateSubfolders: 'can_create_subfolders',
		};
		return mapping[key] || null;
	}
	async getFolderShares(folderId) {
		const shares = await this.dataSource.query(
			`
			SELECT 'user' as type, fp.user_id as id, u.name, fp.role, fp.granted_at, fp.expires_at
			FROM folder_permissions fp
			JOIN users u ON fp.user_id = u.id
			WHERE fp.folder_id = ? AND fp.user_id IS NOT NULL
			
			UNION ALL
			
			SELECT 'team' as type, fp.team_id as id, t.name, fp.role, fp.granted_at, fp.expires_at
			FROM folder_permissions fp
			JOIN teams t ON fp.team_id = t.id
			WHERE fp.folder_id = ? AND fp.team_id IS NOT NULL
			
			UNION ALL
			
			SELECT 'public' as type, fs.id, 'Public Link' as name, fs.role, fs.created_at as granted_at, fs.expires_at
			FROM folder_shares fs
			WHERE fs.folder_id = ? AND fs.recipient_type = 'public' AND fs.is_active = true
		`,
			[folderId, folderId, folderId],
		);
		return shares;
	}
	async getPermissionInheritanceChain(userId, folderId) {
		const query = `
			SELECT wf.id, wf.name, wf.level, fp.*
			FROM workflow_folders wf
			JOIN folder_permissions fp ON wf.id = fp.folder_id
			WHERE fp.user_id = ?
			AND EXISTS (
				SELECT 1 FROM workflow_folders child
				WHERE child.id = ? AND (child.path LIKE CONCAT(wf.path, '/%') OR child.id = wf.id)
			)
			ORDER BY wf.level
		`;
		const results = await this.dataSource.query(query, [userId, folderId]);
		return results.map((row) => ({
			folderId: row.id,
			folderName: row.name,
			level: row.level,
			permissions: {
				folderId: row.folder_id,
				userId: row.user_id,
				role: row.role,
				permissions: {
					canRead: row.can_read,
					canWrite: row.can_write,
					canDelete: row.can_delete,
					canShare: row.can_share,
					canExecute: row.can_execute,
					canCreateSubfolders: row.can_create_subfolders,
				},
				inherited: row.inherited,
				grantedAt: row.granted_at,
				grantedBy: row.granted_by,
				expiresAt: row.expires_at,
			},
		}));
	}
	generateShareId() {
		return `share-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
	}
	generateShareUrl(shareId) {
		return `${process.env.WEBHOOK_TUNNEL_URL || 'http://localhost:5678'}/api/v1/folders/share/${shareId}`;
	}
	async hashPassword(password) {
		const crypto = require('crypto');
		return crypto.createHash('sha256').update(password).digest('hex');
	}
	async logAuditEntry(entry) {
		this.auditLog.push(entry);
		if (this.auditLog.length > this.maxAuditEntries) {
			this.auditLog.splice(0, this.auditLog.length - this.maxAuditEntries);
		}
		this.logger.debug('Folder access audit', entry);
	}
};
exports.FolderPermissionsService = FolderPermissionsService;
exports.FolderPermissionsService = FolderPermissionsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			typeof (_a = typeof typeorm_1.DataSource !== 'undefined' && typeorm_1.DataSource) ===
			'function'
				? _a
				: Object,
			event_service_1.EventService,
			backend_common_1.Logger,
		]),
	],
	FolderPermissionsService,
);
//# sourceMappingURL=folder-permissions.service.js.map
