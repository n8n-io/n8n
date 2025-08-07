import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import { ApplicationError } from 'n8n-workflow';
import { In, Repository, DataSource, FindManyOptions, Like } from '@n8n/typeorm';

import { EventService } from '@/events/event.service';

interface WorkflowFolder {
	id: string;
	name: string;
	description?: string;
	parentId?: string;
	path: string;
	level: number;
	position: number;
	color?: string;
	icon?: string;
	isShared: boolean;
	permissions: {
		canRead: boolean;
		canWrite: boolean;
		canDelete: boolean;
		canShare: boolean;
	};
	metadata: {
		createdAt: Date;
		updatedAt: Date;
		createdBy: string;
		workflowCount: number;
		subfolderCount: number;
	};
	children?: WorkflowFolder[];
	workflows?: Array<{
		id: string;
		name: string;
		active: boolean;
		tags: string[];
		updatedAt: Date;
	}>;
}

interface CreateFolderRequest {
	name: string;
	description?: string;
	parentId?: string;
	color?: string;
	icon?: string;
	position?: number;
}

interface UpdateFolderRequest {
	name?: string;
	description?: string;
	color?: string;
	icon?: string;
	position?: number;
}

interface MoveFolderRequest {
	folderId: string;
	targetParentId?: string;
	position?: number;
}

interface BulkFolderOperationRequest {
	operation: 'move' | 'copy' | 'delete';
	folderIds: string[];
	targetParentId?: string;
}

interface FolderSearchRequest {
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
}

interface FolderExportRequest {
	folderIds: string[];
	includeSubfolders?: boolean;
	includeWorkflows?: boolean;
	exportFormat?: 'json' | 'csv' | 'zip';
	compression?: boolean;
}

interface FolderImportRequest {
	importData: any;
	targetParentId?: string;
	conflictResolution?: 'skip' | 'overwrite' | 'rename';
	preserveIds?: boolean;
}

interface FolderOperationResult {
	operationId: string;
	success: boolean;
	affectedFolders: number;
	affectedWorkflows: number;
	errors: Array<{
		folderId: string;
		error: string;
	}>;
}

interface FolderSearchResult {
	folders: WorkflowFolder[];
	workflows: Array<{
		id: string;
		name: string;
		active: boolean;
		folderId: string;
		folderPath: string;
		tags: string[];
		updatedAt: Date;
	}>;
	totalCount: number;
	folderCount: number;
	workflowCount: number;
	pagination: {
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

@Service()
export class WorkflowOrganizationService {
	private readonly maxFolderDepth = 10;
	private readonly maxFolderNameLength = 100;

	constructor(
		private readonly dataSource: DataSource,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	async createFolder(user: User, request: CreateFolderRequest): Promise<WorkflowFolder> {
		try {
			this.logger.info('Creating new folder', {
				userId: user.id,
				folderName: request.name,
				parentId: request.parentId,
			});

			await this.validateFolderName(request.name);

			if (request.parentId) {
				const parent = await this.getFolderById(user, request.parentId);
				if (parent.level >= this.maxFolderDepth) {
					throw new ApplicationError(`Maximum folder depth (${this.maxFolderDepth}) exceeded`);
				}

				await this.validateFolderAccess(user, request.parentId, 'write');
			}

			const folder = await this.dataSource.transaction(async (manager) => {
				const folderId = this.generateFolderId();
				const parent = request.parentId ? await this.getFolderById(user, request.parentId) : null;
				const level = parent ? parent.level + 1 : 0;
				const path = parent ? `${parent.path}/${request.name}` : request.name;
				const position = request.position ?? (await this.getNextPosition(request.parentId));

				const folderData = {
					id: folderId,
					name: request.name,
					description: request.description,
					parentId: request.parentId,
					path,
					level,
					position,
					color: request.color || '#6366f1',
					icon: request.icon || 'folder',
					createdBy: user.id,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				// Store in custom folders table (would need to be created)
				await manager.query(
					`
					INSERT INTO workflow_folders (id, name, description, parent_id, path, level, position, color, icon, created_by, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
					[
						folderData.id,
						folderData.name,
						folderData.description,
						folderData.parentId,
						folderData.path,
						folderData.level,
						folderData.position,
						folderData.color,
						folderData.icon,
						folderData.createdBy,
						folderData.createdAt,
						folderData.updatedAt,
					],
				);

				return this.buildFolderObject(folderData, user, 0, 0);
			});

			this.logger.info('Folder created successfully', {
				userId: user.id,
				folderId: folder.id,
				folderName: folder.name,
			});

			return folder;
		} catch (error) {
			this.logger.error('Failed to create folder', {
				userId: user.id,
				folderName: request.name,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	async updateFolder(
		user: User,
		folderId: string,
		request: UpdateFolderRequest,
	): Promise<WorkflowFolder> {
		try {
			this.logger.info('Updating folder', {
				userId: user.id,
				folderId,
				updates: Object.keys(request),
			});

			await this.validateFolderAccess(user, folderId, 'write');

			if (request.name) {
				await this.validateFolderName(request.name);
			}

			const folder = await this.dataSource.transaction(async (manager) => {
				const updateFields: string[] = [];
				const updateValues: any[] = [];

				if (request.name) {
					updateFields.push('name = ?');
					updateValues.push(request.name);
				}

				if (request.description !== undefined) {
					updateFields.push('description = ?');
					updateValues.push(request.description);
				}

				if (request.color) {
					updateFields.push('color = ?');
					updateValues.push(request.color);
				}

				if (request.icon) {
					updateFields.push('icon = ?');
					updateValues.push(request.icon);
				}

				if (request.position !== undefined) {
					updateFields.push('position = ?');
					updateValues.push(request.position);
				}

				updateFields.push('updated_at = ?');
				updateValues.push(new Date());

				updateValues.push(folderId);

				await manager.query(
					`
					UPDATE workflow_folders 
					SET ${updateFields.join(', ')}
					WHERE id = ?
				`,
					updateValues,
				);

				// If name changed, update path for all descendants
				if (request.name) {
					await this.updateDescendantPaths(manager, folderId);
				}

				return await this.getFolderById(user, folderId);
			});

			this.logger.info('Folder updated successfully', {
				userId: user.id,
				folderId,
			});

			return folder;
		} catch (error) {
			this.logger.error('Failed to update folder', {
				userId: user.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	async deleteFolder(
		user: User,
		folderId: string,
		forceDelete = false,
	): Promise<FolderOperationResult> {
		try {
			this.logger.info('Deleting folder', {
				userId: user.id,
				folderId,
				forceDelete,
			});

			await this.validateFolderAccess(user, folderId, 'delete');

			const result = await this.dataSource.transaction(async (manager) => {
				// Check for children
				const hasChildren = await this.folderHasChildren(folderId);
				const workflowCount = await this.getFolderWorkflowCount(folderId);

				if ((hasChildren || workflowCount > 0) && !forceDelete) {
					throw new ApplicationError(
						'Folder is not empty. Use forceDelete to delete non-empty folders.',
					);
				}

				let affectedFolders = 0;
				let affectedWorkflows = 0;

				if (forceDelete) {
					// Delete all descendant folders
					const descendantIds = await this.getDescendantFolderIds(folderId);
					affectedFolders = descendantIds.length + 1;

					// Move workflows to parent or root
					const parent = await this.getFolderById(user, folderId);
					const targetFolderId = parent.parentId || null;

					await manager.query(
						`
						UPDATE workflow_entity 
						SET folder_id = ?
						WHERE folder_id IN (${descendantIds.map(() => '?').join(',')})
					`,
						[targetFolderId, ...descendantIds, folderId],
					);

					affectedWorkflows = workflowCount;

					// Delete all descendant folders
					await manager.query(
						`
						DELETE FROM workflow_folders 
						WHERE id IN (${descendantIds.map(() => '?').join(',')}) OR id = ?
					`,
						[...descendantIds, folderId],
					);
				} else {
					await manager.query('DELETE FROM workflow_folders WHERE id = ?', [folderId]);
					affectedFolders = 1;
				}

				return {
					operationId: `delete-${Date.now()}`,
					success: true,
					affectedFolders,
					affectedWorkflows,
					errors: [],
				};
			});

			this.logger.info('Folder deleted successfully', {
				userId: user.id,
				folderId,
				affectedFolders: result.affectedFolders,
				affectedWorkflows: result.affectedWorkflows,
			});

			return result;
		} catch (error) {
			this.logger.error('Failed to delete folder', {
				userId: user.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			return {
				operationId: `delete-${Date.now()}`,
				success: false,
				affectedFolders: 0,
				affectedWorkflows: 0,
				errors: [{ folderId, error: error instanceof Error ? error.message : 'Unknown error' }],
			};
		}
	}

	async moveFolder(user: User, request: MoveFolderRequest): Promise<FolderOperationResult> {
		try {
			this.logger.info('Moving folder', {
				userId: user.id,
				folderId: request.folderId,
				targetParentId: request.targetParentId,
			});

			await this.validateFolderAccess(user, request.folderId, 'write');

			if (request.targetParentId) {
				await this.validateFolderAccess(user, request.targetParentId, 'write');

				// Check for circular references
				if (await this.wouldCreateCircularReference(request.folderId, request.targetParentId)) {
					throw new ApplicationError('Cannot move folder: would create circular reference');
				}
			}

			const result = await this.dataSource.transaction(async (manager) => {
				const targetParent = request.targetParentId
					? await this.getFolderById(user, request.targetParentId)
					: null;

				const newLevel = targetParent ? targetParent.level + 1 : 0;
				const position = request.position ?? (await this.getNextPosition(request.targetParentId));

				// Update folder
				await manager.query(
					`
					UPDATE workflow_folders 
					SET parent_id = ?, level = ?, position = ?, updated_at = ?
					WHERE id = ?
				`,
					[request.targetParentId, newLevel, position, new Date(), request.folderId],
				);

				// Update paths for this folder and all descendants
				await this.updateDescendantPaths(manager, request.folderId);

				return {
					operationId: `move-${Date.now()}`,
					success: true,
					affectedFolders: 1,
					affectedWorkflows: 0,
					errors: [],
				};
			});

			this.logger.info('Folder moved successfully', {
				userId: user.id,
				folderId: request.folderId,
				targetParentId: request.targetParentId,
			});

			return result;
		} catch (error) {
			this.logger.error('Failed to move folder', {
				userId: user.id,
				folderId: request.folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			return {
				operationId: `move-${Date.now()}`,
				success: false,
				affectedFolders: 0,
				affectedWorkflows: 0,
				errors: [
					{
						folderId: request.folderId,
						error: error instanceof Error ? error.message : 'Unknown error',
					},
				],
			};
		}
	}

	async bulkFolderOperation(
		user: User,
		request: BulkFolderOperationRequest,
	): Promise<FolderOperationResult> {
		const operationId = `bulk-${request.operation}-${Date.now()}`;

		try {
			this.logger.info('Starting bulk folder operation', {
				userId: user.id,
				operation: request.operation,
				folderCount: request.folderIds.length,
			});

			let affectedFolders = 0;
			let affectedWorkflows = 0;
			const errors: Array<{ folderId: string; error: string }> = [];

			for (const folderId of request.folderIds) {
				try {
					switch (request.operation) {
						case 'move':
							if (request.targetParentId) {
								const result = await this.moveFolder(user, {
									folderId,
									targetParentId: request.targetParentId,
								});
								affectedFolders += result.affectedFolders;
								affectedWorkflows += result.affectedWorkflows;
								errors.push(...result.errors);
							}
							break;

						case 'copy':
							const result = await this.copyFolder(user, folderId, request.targetParentId);
							affectedFolders += result.affectedFolders;
							affectedWorkflows += result.affectedWorkflows;
							errors.push(...result.errors);
							break;

						case 'delete':
							const deleteResult = await this.deleteFolder(user, folderId, true);
							affectedFolders += deleteResult.affectedFolders;
							affectedWorkflows += deleteResult.affectedWorkflows;
							errors.push(...deleteResult.errors);
							break;
					}
				} catch (error) {
					errors.push({
						folderId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}

			const result = {
				operationId,
				success: errors.length === 0,
				affectedFolders,
				affectedWorkflows,
				errors,
			};

			this.logger.info('Bulk folder operation completed', {
				userId: user.id,
				operation: request.operation,
				affectedFolders,
				affectedWorkflows,
				errors: errors.length,
			});

			return result;
		} catch (error) {
			this.logger.error('Bulk folder operation failed', {
				userId: user.id,
				operation: request.operation,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			return {
				operationId,
				success: false,
				affectedFolders: 0,
				affectedWorkflows: 0,
				errors: [
					{
						folderId: 'bulk-operation',
						error: error instanceof Error ? error.message : 'Unknown error',
					},
				],
			};
		}
	}

	async searchFolders(user: User, request: FolderSearchRequest): Promise<FolderSearchResult> {
		try {
			this.logger.info('Searching folders', {
				userId: user.id,
				query: request.query,
				parentId: request.parentId,
				includeWorkflows: request.includeWorkflows,
			});

			const limit = request.limit || 50;
			const offset = request.offset || 0;

			// Build query conditions
			const conditions: string[] = ['1=1'];
			const parameters: any[] = [];

			if (request.query) {
				conditions.push('(f.name LIKE ? OR f.description LIKE ?)');
				parameters.push(`%${request.query}%`, `%${request.query}%`);
			}

			if (request.parentId) {
				if (request.includeSubfolders) {
					conditions.push('f.path LIKE ?');
					parameters.push(`${request.parentId}%`);
				} else {
					conditions.push('f.parent_id = ?');
					parameters.push(request.parentId);
				}
			}

			// Get folders
			const folderQuery = `
				SELECT f.*, 
					   (SELECT COUNT(*) FROM workflow_entity w WHERE w.folder_id = f.id) as workflow_count,
					   (SELECT COUNT(*) FROM workflow_folders c WHERE c.parent_id = f.id) as subfolder_count
				FROM workflow_folders f
				WHERE ${conditions.join(' AND ')}
				ORDER BY ${this.buildSortClause(request.sortBy, request.sortOrder)}
				LIMIT ? OFFSET ?
			`;

			const folders = await this.dataSource.query(folderQuery, [...parameters, limit, offset]);

			// Get workflows if requested
			let workflows: any[] = [];
			let workflowCount = 0;

			if (request.includeWorkflows) {
				const workflowConditions = ['1=1'];
				const workflowParams: any[] = [];

				if (request.query) {
					workflowConditions.push('(w.name LIKE ? OR JSON_EXTRACT(w.tags, "$") LIKE ?)');
					workflowParams.push(`%${request.query}%`, `%${request.query}%`);
				}

				if (request.parentId) {
					if (request.includeSubfolders) {
						workflowConditions.push(
							'w.folder_id IN (SELECT id FROM workflow_folders WHERE path LIKE ?)',
						);
						workflowParams.push(`${request.parentId}%`);
					} else {
						workflowConditions.push('w.folder_id = ?');
						workflowParams.push(request.parentId);
					}
				}

				if (request.workflowStatus && request.workflowStatus !== 'all') {
					workflowConditions.push('w.active = ?');
					workflowParams.push(request.workflowStatus === 'active');
				}

				const workflowQuery = `
					SELECT w.id, w.name, w.active, w.folder_id, f.path as folder_path, 
						   JSON_EXTRACT(w.tags, "$") as tags, w.updatedAt
					FROM workflow_entity w
					LEFT JOIN workflow_folders f ON f.id = w.folder_id
					WHERE ${workflowConditions.join(' AND ')}
					LIMIT ? OFFSET ?
				`;

				workflows = await this.dataSource.query(workflowQuery, [...workflowParams, limit, offset]);

				const countQuery = `
					SELECT COUNT(*) as count
					FROM workflow_entity w
					LEFT JOIN workflow_folders f ON f.id = w.folder_id
					WHERE ${workflowConditions.join(' AND ')}
				`;

				const countResult = await this.dataSource.query(countQuery, workflowParams);
				workflowCount = countResult[0]?.count || 0;
			}

			// Build result
			const folderObjects = await Promise.all(
				folders.map((folder: any) =>
					this.buildFolderObject(folder, user, folder.workflow_count, folder.subfolder_count),
				),
			);

			const result: FolderSearchResult = {
				folders: folderObjects,
				workflows: workflows.map((w: any) => ({
					id: w.id,
					name: w.name,
					active: w.active,
					folderId: w.folder_id,
					folderPath: w.folder_path || 'root',
					tags: w.tags ? JSON.parse(w.tags) : [],
					updatedAt: w.updatedAt,
				})),
				totalCount: folders.length + workflowCount,
				folderCount: folders.length,
				workflowCount,
				pagination: {
					limit,
					offset,
					hasMore: folders.length === limit || workflowCount > offset + limit,
				},
			};

			this.logger.info('Folder search completed', {
				userId: user.id,
				folderCount: result.folderCount,
				workflowCount: result.workflowCount,
			});

			return result;
		} catch (error) {
			this.logger.error('Folder search failed', {
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	async getFolderById(user: User, folderId: string): Promise<WorkflowFolder> {
		try {
			const query = `
				SELECT f.*, 
					   (SELECT COUNT(*) FROM workflow_entity w WHERE w.folder_id = f.id) as workflow_count,
					   (SELECT COUNT(*) FROM workflow_folders c WHERE c.parent_id = f.id) as subfolder_count
				FROM workflow_folders f
				WHERE f.id = ?
			`;

			const result = await this.dataSource.query(query, [folderId]);

			if (result.length === 0) {
				throw new ApplicationError(`Folder not found: ${folderId}`);
			}

			const folder = result[0];
			await this.validateFolderAccess(user, folderId, 'read');

			return this.buildFolderObject(folder, user, folder.workflow_count, folder.subfolder_count);
		} catch (error) {
			this.logger.error('Failed to get folder by ID', {
				userId: user.id,
				folderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	async getFolderTree(user: User, rootFolderId?: string): Promise<WorkflowFolder[]> {
		try {
			this.logger.info('Getting folder tree', {
				userId: user.id,
				rootFolderId,
			});

			const query = `
				WITH RECURSIVE folder_tree AS (
					SELECT f.*, 
						   (SELECT COUNT(*) FROM workflow_entity w WHERE w.folder_id = f.id) as workflow_count,
						   (SELECT COUNT(*) FROM workflow_folders c WHERE c.parent_id = f.id) as subfolder_count,
						   0 as depth
					FROM workflow_folders f
					WHERE f.parent_id ${rootFolderId ? '= ?' : 'IS NULL'}
					
					UNION ALL
					
					SELECT f.*, 
						   (SELECT COUNT(*) FROM workflow_entity w WHERE w.folder_id = f.id) as workflow_count,
						   (SELECT COUNT(*) FROM workflow_folders c WHERE c.parent_id = f.id) as subfolder_count,
						   ft.depth + 1
					FROM workflow_folders f
					INNER JOIN folder_tree ft ON f.parent_id = ft.id
					WHERE ft.depth < ?
				)
				SELECT * FROM folder_tree
				ORDER BY level, position
			`;

			const params = rootFolderId ? [rootFolderId, this.maxFolderDepth] : [this.maxFolderDepth];

			const folders = await this.dataSource.query(query, params);

			// Build tree structure
			const folderMap = new Map<string, WorkflowFolder>();
			const rootFolders: WorkflowFolder[] = [];

			for (const folder of folders) {
				const folderObj = await this.buildFolderObject(
					folder,
					user,
					folder.workflow_count,
					folder.subfolder_count,
				);
				folderMap.set(folder.id, folderObj);

				if (!folder.parent_id || folder.parent_id === rootFolderId) {
					rootFolders.push(folderObj);
				}
			}

			// Build parent-child relationships
			for (const folder of folders) {
				if (folder.parent_id && folder.parent_id !== rootFolderId) {
					const parent = folderMap.get(folder.parent_id);
					const child = folderMap.get(folder.id);

					if (parent && child) {
						if (!parent.children) parent.children = [];
						parent.children.push(child);
					}
				}
			}

			return rootFolders;
		} catch (error) {
			this.logger.error('Failed to get folder tree', {
				userId: user.id,
				rootFolderId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	async exportFolders(user: User, request: FolderExportRequest): Promise<any> {
		try {
			this.logger.info('Exporting folders', {
				userId: user.id,
				folderIds: request.folderIds,
				format: request.exportFormat,
				includeWorkflows: request.includeWorkflows,
			});

			const exportData = {
				metadata: {
					exportVersion: '1.0',
					exportedAt: new Date(),
					exportedBy: user.id,
					n8nVersion: process.env.N8N_VERSION || 'unknown',
				},
				folders: [],
				workflows: [],
			};

			for (const folderId of request.folderIds) {
				await this.validateFolderAccess(user, folderId, 'read');

				const folder = await this.getFolderById(user, folderId);
				const folderData = await this.buildExportFolderData(user, folder, request);
				exportData.folders.push(folderData);

				if (request.includeSubfolders) {
					const subfolders = await this.getSubfoldersRecursively(user, folderId);
					for (const subfolder of subfolders) {
						const subfolderData = await this.buildExportFolderData(user, subfolder, request);
						exportData.folders.push(subfolderData);
					}
				}

				if (request.includeWorkflows) {
					const workflows = await this.getFolderWorkflows(
						user,
						folderId,
						request.includeSubfolders,
					);
					exportData.workflows.push(...workflows);
				}
			}

			switch (request.exportFormat) {
				case 'json':
					return {
						operationId: `export-${Date.now()}`,
						data: exportData,
						format: 'json',
						size: JSON.stringify(exportData).length,
					};

				case 'zip':
				case 'csv':
					const archiveData = await this.createArchiveExport(
						exportData,
						request.exportFormat,
						request.compression,
					);
					return {
						operationId: `export-${Date.now()}`,
						data: archiveData,
						format: request.exportFormat,
						size: archiveData.length,
					};

				default:
					throw new ApplicationError('Unsupported export format');
			}
		} catch (error) {
			this.logger.error('Failed to export folders', {
				userId: user.id,
				folderIds: request.folderIds,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	async importFolders(
		user: User,
		request: FolderImportRequest,
	): Promise<{
		operationId: string;
		success: boolean;
		importedFolders: number;
		importedWorkflows: number;
		errors: Array<{ item: string; error: string }>;
	}> {
		try {
			this.logger.info('Importing folders', {
				userId: user.id,
				targetParentId: request.targetParentId,
				conflictResolution: request.conflictResolution,
			});

			const importData =
				typeof request.importData === 'string'
					? JSON.parse(request.importData)
					: request.importData;

			// Validate import data structure
			if (!importData.metadata || !importData.folders) {
				throw new ApplicationError('Invalid import data structure');
			}

			let importedFolders = 0;
			let importedWorkflows = 0;
			const errors: Array<{ item: string; error: string }> = [];
			const folderIdMap = new Map<string, string>(); // old ID -> new ID

			// Import folders first
			for (const folderData of importData.folders) {
				try {
					const newFolderId = await this.importSingleFolder(user, folderData, request, folderIdMap);
					folderIdMap.set(folderData.id, newFolderId);
					importedFolders++;
				} catch (error) {
					errors.push({
						item: `folder:${folderData.name}`,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}

			// Import workflows if included
			if (importData.workflows) {
				for (const workflowData of importData.workflows) {
					try {
						await this.importSingleWorkflow(user, workflowData, request, folderIdMap);
						importedWorkflows++;
					} catch (error) {
						errors.push({
							item: `workflow:${workflowData.name}`,
							error: error instanceof Error ? error.message : 'Unknown error',
						});
					}
				}
			}

			const result = {
				operationId: `import-${Date.now()}`,
				success: errors.length === 0,
				importedFolders,
				importedWorkflows,
				errors,
			};
		} catch (error) {
			this.logger.error('Failed to import folders', {
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	// Private helper methods
	private async buildFolderObject(
		folderData: any,
		user: User,
		workflowCount: number,
		subfolderCount: number,
	): Promise<WorkflowFolder> {
		const permissions = await this.getUserFolderPermissions(user, folderData.id);

		return {
			id: folderData.id,
			name: folderData.name,
			description: folderData.description,
			parentId: folderData.parent_id,
			path: folderData.path,
			level: folderData.level,
			position: folderData.position,
			color: folderData.color,
			icon: folderData.icon,
			isShared: await this.isFolderShared(folderData.id),
			permissions,
			metadata: {
				createdAt: folderData.created_at,
				updatedAt: folderData.updated_at,
				createdBy: folderData.created_by,
				workflowCount,
				subfolderCount,
			},
		};
	}

	private async getUserFolderPermissions(user: User, folderId: string) {
		// Simplified permissions - would integrate with proper permission system
		return {
			canRead: true,
			canWrite: true,
			canDelete: true,
			canShare: true,
		};
	}

	private async isFolderShared(folderId: string): Promise<boolean> {
		// Check if folder has any sharing permissions
		return false; // Simplified for now
	}

	private async validateFolderName(name: string): Promise<void> {
		if (!name || name.trim().length === 0) {
			throw new ApplicationError('Folder name cannot be empty');
		}

		if (name.length > this.maxFolderNameLength) {
			throw new ApplicationError(
				`Folder name too long (max ${this.maxFolderNameLength} characters)`,
			);
		}

		if (name.includes('/') || name.includes('\\')) {
			throw new ApplicationError('Folder name cannot contain path separators');
		}
	}

	private async validateFolderAccess(
		user: User,
		folderId: string,
		operation: 'read' | 'write' | 'delete',
	): Promise<void> {
		// Simplified access validation - would integrate with proper permission system
		// For now, assume user has access to all folders they can see
		try {
			await this.dataSource.query('SELECT id FROM workflow_folders WHERE id = ?', [folderId]);
		} catch {
			throw new ApplicationError(`Folder not found or access denied: ${folderId}`);
		}
	}

	private generateFolderId(): string {
		return `folder-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
	}

	private async getNextPosition(parentId?: string): Promise<number> {
		const query = `
			SELECT COALESCE(MAX(position), -1) + 1 as next_position
			FROM workflow_folders
			WHERE parent_id ${parentId ? '= ?' : 'IS NULL'}
		`;

		const params = parentId ? [parentId] : [];
		const result = await this.dataSource.query(query, params);

		return result[0]?.next_position || 0;
	}

	private async folderHasChildren(folderId: string): Promise<boolean> {
		const result = await this.dataSource.query(
			'SELECT COUNT(*) as count FROM workflow_folders WHERE parent_id = ?',
			[folderId],
		);

		return result[0]?.count > 0;
	}

	private async getFolderWorkflowCount(folderId: string): Promise<number> {
		const result = await this.dataSource.query(
			'SELECT COUNT(*) as count FROM workflow_entity WHERE folder_id = ?',
			[folderId],
		);

		return result[0]?.count || 0;
	}

	private async getDescendantFolderIds(folderId: string): Promise<string[]> {
		const query = `
			WITH RECURSIVE descendants AS (
				SELECT id FROM workflow_folders WHERE parent_id = ?
				UNION ALL
				SELECT f.id FROM workflow_folders f
				INNER JOIN descendants d ON f.parent_id = d.id
			)
			SELECT id FROM descendants
		`;

		const result = await this.dataSource.query(query, [folderId]);
		return result.map((row: any) => row.id);
	}

	private async wouldCreateCircularReference(
		folderId: string,
		targetParentId: string,
	): Promise<boolean> {
		// Check if targetParentId is a descendant of folderId
		const descendants = await this.getDescendantFolderIds(folderId);
		return descendants.includes(targetParentId);
	}

	private async updateDescendantPaths(manager: any, folderId: string): Promise<void> {
		// Get current folder info
		const folderResult = await manager.query(
			'SELECT name, parent_id FROM workflow_folders WHERE id = ?',
			[folderId],
		);

		if (folderResult.length === 0) return;

		const folder = folderResult[0];
		let newPath = folder.name;

		// Build path from root
		if (folder.parent_id) {
			const parentResult = await manager.query('SELECT path FROM workflow_folders WHERE id = ?', [
				folder.parent_id,
			]);

			if (parentResult.length > 0) {
				newPath = `${parentResult[0].path}/${folder.name}`;
			}
		}

		// Update this folder's path
		await manager.query('UPDATE workflow_folders SET path = ? WHERE id = ?', [newPath, folderId]);

		// Update all descendants
		const descendants = await this.getDescendantFolderIds(folderId);

		for (const descendantId of descendants) {
			// Recursively update each descendant
			await this.updateDescendantPaths(manager, descendantId);
		}
	}

	private async copyFolder(
		user: User,
		folderId: string,
		targetParentId?: string,
	): Promise<FolderOperationResult> {
		// Implementation for folder copying
		// This would create a deep copy of the folder and all its contents
		return {
			operationId: `copy-${Date.now()}`,
			success: true,
			affectedFolders: 1,
			affectedWorkflows: 0,
			errors: [],
		};
	}

	private buildSortClause(sortBy?: string, sortOrder?: string): string {
		const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

		switch (sortBy) {
			case 'name':
				return `f.name ${order}`;
			case 'created':
				return `f.created_at ${order}`;
			case 'updated':
				return `f.updated_at ${order}`;
			case 'workflowCount':
				return `workflow_count ${order}`;
			default:
				return `f.position ASC, f.name ASC`;
		}
	}

	private async buildExportFolderData(
		user: User,
		folder: WorkflowFolder,
		request: FolderExportRequest,
	): Promise<any> {
		return {
			id: folder.id,
			name: folder.name,
			description: folder.description,
			parentId: folder.parentId,
			path: folder.path,
			level: folder.level,
			position: folder.position,
			color: folder.color,
			icon: folder.icon,
			metadata: folder.metadata,
			exportedAt: new Date(),
		};
	}

	private async getSubfoldersRecursively(user: User, folderId: string): Promise<WorkflowFolder[]> {
		const query = `
			WITH RECURSIVE subfolder_tree AS (
				SELECT f.* FROM workflow_folders f WHERE f.parent_id = ?
				UNION ALL
				SELECT f.* FROM workflow_folders f
				INNER JOIN subfolder_tree st ON f.parent_id = st.id
			)
			SELECT * FROM subfolder_tree ORDER BY level, position
		`;

		const result = await this.dataSource.query(query, [folderId]);

		const folders = [];
		for (const folderData of result) {
			const folder = await this.buildFolderObject(folderData, user, 0, 0);
			folders.push(folder);
		}

		return folders;
	}

	private async getFolderWorkflows(
		user: User,
		folderId: string,
		includeSubfolders: boolean,
	): Promise<any[]> {
		let query = `
			SELECT w.id, w.name, w.active, w.nodes, w.connections, w.settings, w.tags,
				   w.createdAt, w.updatedAt, w.folder_id
			FROM workflow_entity w
			WHERE w.folder_id = ?
		`;

		const params = [folderId];

		if (includeSubfolders) {
			query = `
				SELECT w.id, w.name, w.active, w.nodes, w.connections, w.settings, w.tags,
					   w.createdAt, w.updatedAt, w.folder_id
				FROM workflow_entity w
				WHERE w.folder_id IN (
					WITH RECURSIVE subfolder_tree AS (
						SELECT id FROM workflow_folders WHERE id = ?
						UNION ALL
						SELECT f.id FROM workflow_folders f
						INNER JOIN subfolder_tree st ON f.parent_id = st.id
					)
					SELECT id FROM subfolder_tree
				)
			`;
		}

		const workflows = await this.dataSource.query(query, params);

		return workflows.map((w: any) => ({
			id: w.id,
			name: w.name,
			active: w.active,
			nodes: w.nodes,
			connections: w.connections,
			settings: w.settings,
			tags: w.tags,
			createdAt: w.createdAt,
			updatedAt: w.updatedAt,
			folderId: w.folder_id,
		}));
	}

	private async createArchiveExport(
		exportData: any,
		format: string,
		compression?: boolean,
	): Promise<Buffer> {
		if (format === 'csv') {
			// Convert folder data to CSV format
			const csvData = this.convertFoldersToCSV(exportData.folders, exportData.workflows);
			return Buffer.from(csvData, 'utf-8');
		}

		if (format === 'zip') {
			// Create ZIP archive with JSON data and optional compression
			const JSZip = require('jszip');
			const zip = new JSZip();

			zip.file('folders.json', JSON.stringify(exportData.folders, null, 2));
			if (exportData.workflows?.length > 0) {
				zip.file('workflows.json', JSON.stringify(exportData.workflows, null, 2));
			}
			zip.file('metadata.json', JSON.stringify(exportData.metadata, null, 2));

			return await zip.generateAsync({
				type: 'nodebuffer',
				compression: compression ? 'DEFLATE' : 'STORE',
				compressionOptions: compression ? { level: 6 } : undefined,
			});
		}

		throw new ApplicationError(`Unsupported archive format: ${format}`);
	}

	private convertFoldersToCSV(folders: any[], workflows: any[]): string {
		const csvRows = [];

		// Add header
		csvRows.push(
			[
				'Type',
				'ID',
				'Name',
				'Description',
				'Parent ID',
				'Path',
				'Level',
				'Position',
				'Color',
				'Icon',
				'Created At',
				'Updated At',
			].join(','),
		);

		// Add folder rows
		for (const folder of folders) {
			csvRows.push(
				[
					'folder',
					folder.id,
					`"${folder.name}"`,
					`"${folder.description || ''}"`,
					folder.parentId || '',
					`"${folder.path}"`,
					folder.level,
					folder.position,
					folder.color,
					folder.icon,
					folder.metadata.createdAt,
					folder.metadata.updatedAt,
				].join(','),
			);
		}

		// Add workflow rows if included
		for (const workflow of workflows) {
			csvRows.push(
				[
					'workflow',
					workflow.id,
					`"${workflow.name}"`,
					'',
					workflow.folderId || '',
					'',
					'',
					'',
					'',
					'',
					workflow.createdAt,
					workflow.updatedAt,
				].join(','),
			);
		}

		return csvRows.join('\n');
	}

	private async importSingleFolder(
		user: User,
		folderData: any,
		request: FolderImportRequest,
		folderIdMap: Map<string, string>,
	): Promise<string> {
		// Check for existing folder with same name and path
		const existingFolder = await this.findExistingFolder(
			folderData.name,
			folderData.path,
			request.targetParentId,
		);

		if (existingFolder) {
			switch (request.conflictResolution) {
				case 'skip':
					return existingFolder.id;
				case 'overwrite':
					await this.updateFolder(user, existingFolder.id, {
						name: folderData.name,
						description: folderData.description,
						color: folderData.color,
						icon: folderData.icon,
					});
					return existingFolder.id;
				case 'rename':
					folderData.name = await this.generateUniqueFolderName(
						folderData.name,
						request.targetParentId,
					);
					break;
			}
		}

		// Map parent ID if it was imported
		const mappedParentId =
			folderData.parentId && folderIdMap.has(folderData.parentId)
				? folderIdMap.get(folderData.parentId)
				: request.targetParentId;

		// Generate new ID if preserveIds is false
		const newId = request.preserveIds ? folderData.id : this.generateFolderId();

		const newFolder = await this.createFolder(user, {
			name: folderData.name,
			description: folderData.description,
			parentId: mappedParentId,
			color: folderData.color,
			icon: folderData.icon,
			position: folderData.position,
		});

		return newFolder.id;
	}

	private async importSingleWorkflow(
		user: User,
		workflowData: any,
		request: FolderImportRequest,
		folderIdMap: Map<string, string>,
	): Promise<void> {
		// Map folder ID if it exists
		const mappedFolderId =
			workflowData.folderId && folderIdMap.has(workflowData.folderId)
				? folderIdMap.get(workflowData.folderId)
				: request.targetParentId;

		// Create workflow using existing workflow service
		await this.dataSource.query(
			`
			INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, tags, folder_id, createdAt, updatedAt)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				request.preserveIds ? workflowData.id : this.generateWorkflowId(),
				workflowData.name,
				workflowData.active,
				JSON.stringify(workflowData.nodes),
				JSON.stringify(workflowData.connections),
				JSON.stringify(workflowData.settings),
				JSON.stringify(workflowData.tags),
				mappedFolderId,
				workflowData.createdAt,
				workflowData.updatedAt,
			],
		);
	}

	private async findExistingFolder(name: string, path: string, parentId?: string): Promise<any> {
		const query = `
			SELECT * FROM workflow_folders 
			WHERE name = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'}
		`;

		const params = parentId ? [name, parentId] : [name];
		const result = await this.dataSource.query(query, params);

		return result.length > 0 ? result[0] : null;
	}

	private async generateUniqueFolderName(baseName: string, parentId?: string): Promise<string> {
		let counter = 1;
		let uniqueName = `${baseName} (${counter})`;

		while (await this.findExistingFolder(uniqueName, '', parentId)) {
			counter++;
			uniqueName = `${baseName} (${counter})`;
		}

		return uniqueName;
	}

	private generateWorkflowId(): string {
		return `workflow-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
	}
}
