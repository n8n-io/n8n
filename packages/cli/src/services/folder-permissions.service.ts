import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import { ApplicationError } from 'n8n-workflow';
import { DataSource, In } from '@n8n/typeorm';

import { EventService } from '@/events/event.service';

interface FolderPermission {
	folderId: string;
	userId?: string;
	teamId?: string;
	role: 'owner' | 'editor' | 'viewer';
	permissions: {
		canRead: boolean;
		canWrite: boolean;
		canDelete: boolean;
		canShare: boolean;
		canExecute: boolean;
		canCreateSubfolders: boolean;
	};
	inherited: boolean;
	grantedAt: Date;
	grantedBy: string;
	expiresAt?: Date;
}

interface FolderAccessRequest {
	folderId: string;
	userIds?: string[];
	teamIds?: string[];
	role: 'owner' | 'editor' | 'viewer';
	permissions?: Partial<{
		canRead: boolean;
		canWrite: boolean;
		canDelete: boolean;
		canShare: boolean;
		canExecute: boolean;
		canCreateSubfolders: boolean;
	}>;
	expiresAt?: Date;
	inheritToChildren?: boolean;
}

interface FolderSharingRequest {
	folderId: string;
	recipientType: 'user' | 'team' | 'public' | 'link';
	recipientIds?: string[];
	role: 'editor' | 'viewer';
	expiresAt?: Date;
	allowCopy?: boolean;
	allowDownload?: boolean;
	requirePassword?: boolean;
	password?: string;
}

interface FolderAccessAudit {
	folderId: string;
	userId: string;
	action: 'read' | 'write' | 'delete' | 'share' | 'execute' | 'create_subfolder';
	resource?: string;
	timestamp: Date;
	ipAddress?: string;
	userAgent?: string;
	result: 'allowed' | 'denied';
	reason?: string;
}

interface BulkPermissionUpdate {
	folderIds: string[];
	operation: 'grant' | 'revoke' | 'update';
	userIds?: string[];
	teamIds?: string[];
	role?: 'owner' | 'editor' | 'viewer';
	permissions?: Partial<{
		canRead: boolean;
		canWrite: boolean;
		canDelete: boolean;
		canShare: boolean;
		canExecute: boolean;
		canCreateSubfolders: boolean;
	}>;
	inheritToChildren?: boolean;
}

interface FolderPermissionSummary {
	folderId: string;
	folderName: string;
	folderPath: string;
	userPermission: FolderPermission | null;
	effectivePermissions: {
		canRead: boolean;
		canWrite: boolean;
		canDelete: boolean;
		canShare: boolean;
		canExecute: boolean;
		canCreateSubfolders: boolean;
	};
	sharedWith: Array<{
		type: 'user' | 'team' | 'public';
		id: string;
		name: string;
		role: string;
		grantedAt: Date;
		expiresAt?: Date;
	}>;
	inheritanceChain: Array<{
		folderId: string;
		folderName: string;
		level: number;
		permissions: FolderPermission;
	}>;
}

@Service()
export class FolderPermissionsService {
	private readonly auditLog: FolderAccessAudit[] = [];
	private readonly maxAuditEntries = 10000;

	constructor(
		private readonly dataSource: DataSource,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	async grantFolderAccess(
		user: User,
		request: FolderAccessRequest,
	): Promise<{
		success: boolean;
		grantedPermissions: number;
		errors: Array<{ recipientId: string; error: string }>;
	}> {
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
			const errors: Array<{ recipientId: string; error: string }> = [];

			// Grant permissions to users
			if (request.userIds?.length) {
				for (const userId of request.userIds) {
					try {
						await this.grantUserFolderPermission(
							request.folderId,
							userId,
							request.role,
							user.id,
							request.permissions,
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

			// Grant permissions to teams
			if (request.teamIds?.length) {
				for (const teamId of request.teamIds) {
					try {
						await this.grantTeamFolderPermission(
							request.folderId,
							teamId,
							request.role,
							user.id,
							request.permissions,
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

			// Event logging removed for initial implementation
			// this.eventService.emit('folder-access-granted', {
			//		userId: user.id,
			//		folderId: request.folderId,
			//		recipientCount: grantedPermissions,
			//		role: request.role,
			// });

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

	async revokeFolderAccess(
		user: User,
		folderId: string,
		recipientIds: string[],
	): Promise<{
		success: boolean;
		revokedPermissions: number;
		errors: Array<{ recipientId: string; error: string }>;
	}> {
		try {
			this.logger.info('Revoking folder access', {
				userId: user.id,
				folderId,
				recipientCount: recipientIds.length,
			});

			await this.validateFolderOwnership(user, folderId);

			let revokedPermissions = 0;
			const errors: Array<{ recipientId: string; error: string }> = [];

			for (const recipientId of recipientIds) {
				try {
					await this.dataSource.transaction(async (manager) => {
						// Revoke user permissions
						await manager.query(
							`
							DELETE FROM folder_permissions 
							WHERE folder_id = ? AND (user_id = ? OR team_id = ?)
						`,
							[folderId, recipientId, recipientId],
						);

						// Also revoke from child folders if inherited
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

			// this.eventService.emit('folder-access-revoked', {
			//	userId: user.id,
			//	folderId,
			//	revokedPermissions,
			// });

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

	async shareFolderPublicly(
		user: User,
		request: FolderSharingRequest,
	): Promise<{
		shareId: string;
		shareUrl: string;
		expiresAt?: Date;
	}> {
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

			// this.eventService.emit('folder-shared-publicly', {
			//	userId: user.id,
			//	folderId: request.folderId,
			//	shareId,
			//	recipientType: request.recipientType,
			// });

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

	async checkFolderPermission(
		user: User,
		folderId: string,
		action: 'read' | 'write' | 'delete' | 'share' | 'execute' | 'create_subfolder',
	): Promise<{
		allowed: boolean;
		reason?: string;
		inheritedFrom?: string;
	}> {
		try {
			// Get user's direct permissions
			const directPermission = await this.getUserFolderPermission(user.id, folderId);

			// Get inherited permissions from parent folders
			const inheritedPermission = await this.getInheritedFolderPermission(user.id, folderId);

			// Combine permissions (direct takes precedence)
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

			// Check specific permission
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

	async getFolderPermissions(user: User, folderId: string): Promise<FolderPermissionSummary> {
		try {
			this.logger.info('Getting folder permissions', {
				userId: user.id,
				folderId,
			});

			// Get folder info
			const folderInfo = await this.dataSource.query(
				`
				SELECT id, name, path FROM workflow_folders WHERE id = ?
			`,
				[folderId],
			);

			if (folderInfo.length === 0) {
				throw new ApplicationError(`Folder not found: ${folderId}`);
			}

			const folder = folderInfo[0];

			// Get user's permission
			const userPermission = await this.getUserFolderPermission(user.id, folderId);

			// Get effective permissions (including inheritance)
			const effectivePermissions = await this.getEffectiveFolderPermissions(user.id, folderId);

			// Get who the folder is shared with
			const sharedWith = await this.getFolderShares(folderId);

			// Get inheritance chain
			const inheritanceChain = await this.getPermissionInheritanceChain(user.id, folderId);

			const summary: FolderPermissionSummary = {
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

	async bulkUpdatePermissions(
		user: User,
		request: BulkPermissionUpdate,
	): Promise<{
		success: boolean;
		processedFolders: number;
		errors: Array<{ folderId: string; error: string }>;
	}> {
		try {
			this.logger.info('Bulk updating folder permissions', {
				userId: user.id,
				operation: request.operation,
				folderCount: request.folderIds.length,
			});

			let processedFolders = 0;
			const errors: Array<{ folderId: string; error: string }> = [];

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
										user.id,
										request.permissions,
									);
								}
							}
							if (request.teamIds?.length) {
								for (const teamId of request.teamIds) {
									await this.grantTeamFolderPermission(
										folderId,
										teamId,
										request.role || 'viewer',
										user.id,
										request.permissions,
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

			// this.eventService.emit('bulk-folder-permissions-updated', {
			//	userId: user.id,
			//	operation: request.operation,
			//	processedFolders,
			//	errors: errors.length,
			// });

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

	async getAccessAuditLog(
		user: User,
		folderId?: string,
		limit = 100,
	): Promise<FolderAccessAudit[]> {
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

			// Return most recent entries
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

	// Private helper methods
	private async validateFolderOwnership(user: User, folderId: string): Promise<void> {
		// Check if user is folder owner or has admin rights
		const permission = await this.getUserFolderPermission(user.id, folderId);

		if (!permission || (permission.role !== 'owner' && !permission.permissions.canShare)) {
			throw new ApplicationError('Insufficient permissions to manage folder access');
		}
	}

	private async grantUserFolderPermission(
		folderId: string,
		userId: string,
		role: 'owner' | 'editor' | 'viewer',
		grantedBy: string,
		customPermissions?: Partial<FolderPermission['permissions']>,
		expiresAt?: Date,
	): Promise<void> {
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

	private async grantTeamFolderPermission(
		folderId: string,
		teamId: string,
		role: 'owner' | 'editor' | 'viewer',
		grantedBy: string,
		customPermissions?: Partial<FolderPermission['permissions']>,
		expiresAt?: Date,
	): Promise<void> {
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

	private getRolePermissions(
		role: string,
		customPermissions?: Partial<FolderPermission['permissions']>,
	): FolderPermission['permissions'] {
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
			...basePermissions[role as keyof typeof basePermissions],
			...customPermissions,
		};
	}

	private async getUserFolderPermission(
		userId: string,
		folderId: string,
	): Promise<FolderPermission | null> {
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

	private async getInheritedFolderPermission(
		userId: string,
		folderId: string,
	): Promise<FolderPermission | null> {
		// Get parent folders and check for inherited permissions
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

	private async getEffectiveFolderPermissions(
		userId: string,
		folderId: string,
	): Promise<FolderPermission['permissions']> {
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

	private hasPermissionForAction(
		permissions: FolderPermission['permissions'],
		action: string,
	): boolean {
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

	private async propagatePermissionsToChildren(
		folderId: string,
		userId: string,
		role: string,
	): Promise<void> {
		const childFolders = await this.dataSource.query(
			`
			SELECT id FROM workflow_folders 
			WHERE path LIKE (SELECT CONCAT(path, '/%') FROM workflow_folders WHERE id = ?)
		`,
			[folderId],
		);

		for (const child of childFolders) {
			await this.grantUserFolderPermission(child.id, userId, role as any, 'system', undefined);
		}
	}

	private async propagateTeamPermissionsToChildren(
		folderId: string,
		teamId: string,
		role: string,
	): Promise<void> {
		const childFolders = await this.dataSource.query(
			`
			SELECT id FROM workflow_folders 
			WHERE path LIKE (SELECT CONCAT(path, '/%') FROM workflow_folders WHERE id = ?)
		`,
			[folderId],
		);

		for (const child of childFolders) {
			await this.grantTeamFolderPermission(child.id, teamId, role as any, 'system', undefined);
		}
	}

	private async propagateBulkPermissionsToChildren(
		folderId: string,
		request: BulkPermissionUpdate,
	): Promise<void> {
		// Implementation for propagating bulk permissions to children
		// This would handle complex inheritance scenarios
	}

	private async updateFolderPermissions(
		folderId: string,
		permissions: Partial<FolderPermission['permissions']>,
	): Promise<void> {
		const updateFields: string[] = [];
		const updateValues: any[] = [];

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

	private convertPermissionKeyToDbField(key: string): string | null {
		const mapping: Record<string, string> = {
			canRead: 'can_read',
			canWrite: 'can_write',
			canDelete: 'can_delete',
			canShare: 'can_share',
			canExecute: 'can_execute',
			canCreateSubfolders: 'can_create_subfolders',
		};

		return mapping[key] || null;
	}

	private async getFolderShares(folderId: string): Promise<
		Array<{
			type: 'user' | 'team' | 'public';
			id: string;
			name: string;
			role: string;
			grantedAt: Date;
			expiresAt?: Date;
		}>
	> {
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

	private async getPermissionInheritanceChain(
		userId: string,
		folderId: string,
	): Promise<
		Array<{
			folderId: string;
			folderName: string;
			level: number;
			permissions: FolderPermission;
		}>
	> {
		// Get the inheritance chain showing where permissions come from
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

		return results.map((row: any) => ({
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

	private generateShareId(): string {
		return `share-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
	}

	private generateShareUrl(shareId: string): string {
		return `${process.env.WEBHOOK_TUNNEL_URL || 'http://localhost:5678'}/api/v1/folders/share/${shareId}`;
	}

	private async hashPassword(password: string): Promise<string> {
		// Simple hash - in production use bcrypt or similar
		const crypto = require('crypto');
		return crypto.createHash('sha256').update(password).digest('hex');
	}

	private async logAuditEntry(entry: FolderAccessAudit): Promise<void> {
		this.auditLog.push(entry);

		// Keep only the most recent entries
		if (this.auditLog.length > this.maxAuditEntries) {
			this.auditLog.splice(0, this.auditLog.length - this.maxAuditEntries);
		}

		// In production, this would write to a database or log service
		this.logger.debug('Folder access audit', entry as unknown as Record<string, unknown>);
	}
}
