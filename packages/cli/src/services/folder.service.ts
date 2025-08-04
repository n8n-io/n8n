import type { CreateFolderDto, DeleteFolderDto, UpdateFolderDto } from '@n8n/api-types';
import type {
	FolderWithWorkflowAndSubFolderCount,
	FolderWithWorkflowAndSubFolderCountAndPath,
	User,
} from '@n8n/db';
import { Folder, FolderTagMappingRepository, FolderRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { UserError, PROJECT_ROOT } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import type { ListQuery } from '@/requests';
import { WorkflowService } from '@/workflows/workflow.service';

export interface SimpleFolderNode {
	id: string;
	name: string;
	children: SimpleFolderNode[];
}

interface FolderPathRow {
	folder_id: string;
	folder_name: string;
	folder_parent_folder_id: string | null;
}

@Service()
export class FolderService {
	constructor(
		private readonly folderRepository: FolderRepository,
		private readonly folderTagMappingRepository: FolderTagMappingRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowService: WorkflowService,
	) {}

	async createFolder({ parentFolderId, name }: CreateFolderDto, projectId: string) {
		let parentFolder = null;
		if (parentFolderId) {
			parentFolder = await this.findFolderInProjectOrFail(parentFolderId, projectId);
		}

		const folderEntity = this.folderRepository.create({
			name,
			homeProject: { id: projectId },
			parentFolder,
		});

		const { homeProject, ...folder } = await this.folderRepository.save(folderEntity);

		return folder;
	}

	async updateFolder(
		folderId: string,
		projectId: string,
		{ name, tagIds, parentFolderId }: UpdateFolderDto,
	) {
		await this.findFolderInProjectOrFail(folderId, projectId);
		if (name) {
			await this.folderRepository.update({ id: folderId }, { name });
		}
		if (tagIds) {
			await this.folderTagMappingRepository.overwriteTags(folderId, tagIds);
		}

		if (parentFolderId) {
			if (folderId === parentFolderId) {
				throw new UserError('Cannot set a folder as its own parent');
			}

			if (parentFolderId !== PROJECT_ROOT) {
				await this.findFolderInProjectOrFail(parentFolderId, projectId);

				// Ensure that the target parentFolder isn't a descendant of the current folder.
				const parentFolderPath = await this.getFolderTree(parentFolderId, projectId);
				if (this.isDescendant(folderId, parentFolderPath)) {
					throw new UserError(
						"Cannot set a folder's parent to a folder that is a descendant of the current folder",
					);
				}
			}

			await this.folderRepository.update(
				{ id: folderId },
				{ parentFolder: parentFolderId !== PROJECT_ROOT ? { id: parentFolderId } : null },
			);
		}
	}

	async findFolderInProjectOrFail(folderId: string, projectId: string, em?: EntityManager) {
		try {
			return await this.folderRepository.findOneOrFailFolderInProject(folderId, projectId, em);
		} catch {
			throw new FolderNotFoundError(folderId);
		}
	}

	async getFolderTree(folderId: string, projectId: string): Promise<SimpleFolderNode[]> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		const escapedParentFolderId = this.folderRepository
			.createQueryBuilder()
			.escape('parentFolderId');

		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.addSelect('folder.parentFolderId', 'parentFolderId')
			.where('folder.id = :folderId', { folderId });

		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.addSelect('f.parentFolderId', 'parentFolderId')
			.innerJoin('folder_path', 'fp', `f.id = fp.${escapedParentFolderId}`);

		const mainQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'folder_id')
			.addSelect('folder.name', 'folder_name')
			.addSelect('folder.parentFolderId', 'folder_parent_folder_id')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.where((qb) => {
				const subQuery = qb.subQuery().select('fp.id').from('folder_path', 'fp').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.setParameters({
				folderId,
			});

		const result = await mainQuery.getRawMany<FolderPathRow>();

		return this.transformFolderPathToTree(result);
	}

	/**
	 * Moves all workflows in a folder to the root of the project and archives them,
	 * flattening the folder structure.
	 *
	 * If any workflows were active this will also deactivate those workflows.
	 */
	async flattenAndArchive(user: User, folderId: string, projectId: string): Promise<void> {
		const workflowIds = await this.workflowRepository.getAllWorkflowIdsInHierarchy(
			folderId,
			projectId,
		);

		for (const workflowId of workflowIds) {
			await this.workflowService.archive(user, workflowId, true);
		}

		await this.workflowRepository.moveToFolder(workflowIds, PROJECT_ROOT);
	}

	async deleteFolder(
		user: User,
		folderId: string,
		projectId: string,
		{ transferToFolderId }: DeleteFolderDto,
	) {
		await this.findFolderInProjectOrFail(folderId, projectId);

		if (!transferToFolderId) {
			await this.flattenAndArchive(user, folderId, projectId);
			await this.folderRepository.delete({ id: folderId });
			return;
		}

		if (folderId === transferToFolderId) {
			throw new UserError('Cannot transfer folder contents to the folder being deleted');
		}

		if (transferToFolderId !== PROJECT_ROOT) {
			await this.findFolderInProjectOrFail(transferToFolderId, projectId);
		}

		return await this.folderRepository.manager.transaction(async (tx) => {
			await this.folderRepository.moveAllToFolder(folderId, transferToFolderId, tx);
			await this.workflowRepository.moveAllToFolder(folderId, transferToFolderId, tx);
			await tx.delete(Folder, { id: folderId });
			return;
		});
	}

	async transferAllFoldersToProject(
		fromProjectId: string,
		toProjectId: string,
		tx?: EntityManager,
	) {
		return await this.folderRepository.transferAllFoldersToProject(fromProjectId, toProjectId, tx);
	}

	private transformFolderPathToTree(flatPath: FolderPathRow[]): SimpleFolderNode[] {
		if (!flatPath || flatPath.length === 0) {
			return [];
		}

		const folderMap = new Map<string, SimpleFolderNode>();

		// First pass: create all nodes
		flatPath.forEach((folder) => {
			folderMap.set(folder.folder_id, {
				id: folder.folder_id,
				name: folder.folder_name,
				children: [],
			});
		});

		let rootNode: SimpleFolderNode | null = null;

		// Second pass: build the tree
		flatPath.forEach((folder) => {
			const currentNode = folderMap.get(folder.folder_id)!;

			if (folder.folder_parent_folder_id && folderMap.has(folder.folder_parent_folder_id)) {
				const parentNode = folderMap.get(folder.folder_parent_folder_id)!;
				parentNode.children = [currentNode];
			} else {
				rootNode = currentNode;
			}
		});

		return rootNode ? [rootNode] : [];
	}

	private isDescendant(folderId: string, tree: SimpleFolderNode[]): boolean {
		return tree.some((node) => {
			if (node.id === folderId) {
				return true;
			}
			return this.isDescendant(folderId, node.children);
		});
	}

	async getFolderAndWorkflowCount(
		folderId: string,
		projectId: string,
	): Promise<{ totalSubFolders: number; totalWorkflows: number }> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.where('folder.id = :folderId', { folderId });

		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.innerJoin('folder_path', 'fp', 'f.parentFolderId = fp.id');

		// Count all folders in the hierarchy (excluding the root folder)
		const subFolderCountQuery = this.folderRepository
			.createQueryBuilder('folder')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.select('COUNT(DISTINCT folder.id) - 1', 'count')
			.where((qb) => {
				const subQuery = qb.subQuery().select('fp.id').from('folder_path', 'fp').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.setParameters({
				folderId,
			});

		// Count workflows in the folder and all subfolders
		const workflowCountQuery = this.workflowRepository
			.createQueryBuilder('workflow')
			.select('COUNT(workflow.id)', 'count')
			.where('workflow.isArchived = :isArchived', { isArchived: false })
			.andWhere((qb) => {
				const folderQuery = qb.subQuery().from('folder_path', 'fp').select('fp.id').getQuery();
				return `workflow.parentFolderId IN ${folderQuery}`;
			})
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.setParameters({
				folderId,
			});

		// Execute both queries in parallel
		const [subFolderResult, workflowResult] = await Promise.all([
			subFolderCountQuery.getRawOne<{ count: string }>(),
			workflowCountQuery.getRawOne<{ count: string }>(),
		]);

		return {
			totalSubFolders: parseInt(subFolderResult?.count ?? '0', 10),
			totalWorkflows: parseInt(workflowResult?.count ?? '0', 10),
		};
	}

	async getManyAndCount(projectId: string, options: ListQuery.Options) {
		options.filter = { ...options.filter, projectId, isArchived: false };
		// eslint-disable-next-line prefer-const
		let [folders, count] = await this.folderRepository.getManyAndCount(options);
		if (options.select?.path) {
			folders = await this.enrichFoldersWithPaths(folders);
		}
		return [folders, count];
	}

	private async enrichFoldersWithPaths(
		folders: FolderWithWorkflowAndSubFolderCount[],
	): Promise<FolderWithWorkflowAndSubFolderCountAndPath[]> {
		const folderIds = folders.map((folder) => folder.id);

		const folderPaths = await this.folderRepository.getFolderPathsToRoot(folderIds);

		return folders.map(
			(folder) =>
				({
					...folder,
					path: folderPaths.get(folder.id),
				}) as FolderWithWorkflowAndSubFolderCountAndPath,
		);
	}

	async getFolderPath(folderId: string, projectId: string): Promise<string[]> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		const paths = await this.folderRepository.getFolderPathsToRoot([folderId]);
		return paths.get(folderId) || [];
	}

	async getFolderAncestors(folderId: string, projectId: string): Promise<Folder[]> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		const ancestorQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.addSelect('folder.parentFolderId', 'parentFolderId')
			.where('folder.id = :folderId', { folderId });

		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.addSelect('f.parentFolderId', 'parentFolderId')
			.innerJoin('folder_ancestors', 'fa', 'f.id = fa.parentFolderId')
			.where('f.parentFolderId IS NOT NULL');

		const mainQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select([
				'folder.id',
				'folder.name',
				'folder.parentFolderId',
				'folder.createdAt',
				'folder.updatedAt',
			])
			.addCommonTableExpression(
				`${ancestorQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_ancestors',
				{ recursive: true },
			)
			.where((qb) => {
				const subQuery = qb.subQuery().select('fa.id').from('folder_ancestors', 'fa').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.andWhere('folder.id != :folderId', { folderId })
			.orderBy('folder.parentFolderId', 'ASC')
			.setParameters({ folderId });

		return await mainQuery.getMany();
	}

	async getFolderDescendants(folderId: string, projectId: string): Promise<Folder[]> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.where('folder.parentFolderId = :folderId', { folderId });

		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.innerJoin('folder_descendants', 'fd', 'f.parentFolderId = fd.id');

		const mainQuery = this.folderRepository
			.createQueryBuilder('folder')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_descendants',
				{ recursive: true },
			)
			.where((qb) => {
				const subQuery = qb.subQuery().select('fd.id').from('folder_descendants', 'fd').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.orderBy('folder.name', 'ASC')
			.setParameters({ folderId });

		return await mainQuery.getMany();
	}

	async duplicateFolder(
		folderId: string,
		projectId: string,
		options: { name?: string; parentFolderId?: string; includeWorkflows?: boolean },
	): Promise<Folder> {
		const sourceFolder = await this.findFolderInProjectOrFail(folderId, projectId);
		const { name, parentFolderId, includeWorkflows = false } = options;

		let parentFolder = null;
		if (parentFolderId) {
			parentFolder = await this.findFolderInProjectOrFail(parentFolderId, projectId);
		}

		return await this.folderRepository.manager.transaction(async (tx) => {
			// Create the duplicated folder
			const duplicatedFolder = tx.create(Folder, {
				name: name || `${sourceFolder.name} (Copy)`,
				homeProject: { id: projectId },
				parentFolder,
			});

			const savedFolder = await tx.save(duplicatedFolder);

			// If includeWorkflows is true, duplicate workflows as well
			if (includeWorkflows) {
				const workflows = await this.workflowRepository.find({
					where: { parentFolder: { id: folderId } },
				});

				for (const workflow of workflows) {
					const duplicatedWorkflow = tx.create('WorkflowEntity', {
						...workflow,
						id: undefined,
						name: `${workflow.name} (Copy)`,
						parentFolder: savedFolder,
						active: false,
						versionId: undefined,
					});
					await tx.save(duplicatedWorkflow);
				}
			}

			// Recursively duplicate subfolders
			const subFolders = await this.folderRepository.find({
				where: { parentFolder: { id: folderId } },
			});

			for (const subFolder of subFolders) {
				await this.duplicateFolder(subFolder.id, projectId, {
					parentFolderId: savedFolder.id,
					includeWorkflows,
				});
			}

			return savedFolder;
		});
	}

	async bulkMoveFolders(
		folderIds: string[],
		projectId: string,
		targetFolderId?: string,
	): Promise<{ success: string[]; errors: Array<{ folderId: string; error: string }> }> {
		const results = {
			success: [] as string[],
			errors: [] as Array<{ folderId: string; error: string }>,
		};

		let targetFolder = null;
		if (targetFolderId && targetFolderId !== PROJECT_ROOT) {
			try {
				targetFolder = await this.findFolderInProjectOrFail(targetFolderId, projectId);
			} catch (error) {
				// If target folder doesn't exist, all moves will fail
				folderIds.forEach((folderId) => {
					results.errors.push({
						folderId,
						error: `Target folder ${targetFolderId} not found`,
					});
				});
				return results;
			}
		}

		await this.folderRepository.manager.transaction(async (tx) => {
			for (const folderId of folderIds) {
				try {
					// Verify folder exists in project
					await this.findFolderInProjectOrFail(folderId, projectId, tx);

					// Check for circular reference
					if (targetFolderId && targetFolderId !== PROJECT_ROOT) {
						const tree = await this.getFolderTree(folderId, projectId);
						if (this.isDescendant(targetFolderId, tree)) {
							results.errors.push({
								folderId,
								error: 'Cannot move folder to its own descendant',
							});
							continue;
						}
					}

					// Perform the move
					await tx.update(
						Folder,
						{ id: folderId },
						{
							parentFolder: targetFolder ? { id: targetFolder.id } : null,
						},
					);

					results.success.push(folderId);
				} catch (error) {
					results.errors.push({
						folderId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		});

		return results;
	}

	async bulkDeleteFolders(
		user: User,
		folderIds: string[],
		projectId: string,
		transferToFolderId?: string,
	): Promise<{ success: string[]; errors: Array<{ folderId: string; error: string }> }> {
		const results = {
			success: [] as string[],
			errors: [] as Array<{ folderId: string; error: string }>,
		};

		let transferFolder = null;
		if (transferToFolderId && transferToFolderId !== PROJECT_ROOT) {
			try {
				transferFolder = await this.findFolderInProjectOrFail(transferToFolderId, projectId);
			} catch (error) {
				// If transfer folder doesn't exist, all deletions will fail
				folderIds.forEach((folderId) => {
					results.errors.push({
						folderId,
						error: `Transfer folder ${transferToFolderId} not found`,
					});
				});
				return results;
			}
		}

		for (const folderId of folderIds) {
			try {
				await this.deleteFolder(user, folderId, projectId, {
					transferToFolderId: transferToFolderId,
				});
				results.success.push(folderId);
			} catch (error) {
				results.errors.push({
					folderId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return results;
	}

	async getFolderPermissions(
		user: User,
		folderId: string,
		projectId: string,
	): Promise<Record<string, boolean>> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		// This is a simplified permission check - in a real implementation,
		// you would check actual user roles and project permissions
		return {
			canRead: true,
			canWrite: true,
			canDelete: true,
			canCreate: true,
			canMove: true,
			canShare: true,
		};
	}

	async getFolderStatistics(
		folderId: string,
		projectId: string,
	): Promise<{
		totalSubFolders: number;
		totalWorkflows: number;
		activeWorkflows: number;
		totalSize: number;
		lastModified: Date;
		depth: number;
	}> {
		await this.findFolderInProjectOrFail(folderId, projectId);

		// Get basic folder and workflow counts
		const { totalSubFolders, totalWorkflows } = await this.getFolderAndWorkflowCount(
			folderId,
			projectId,
		);

		// Count active workflows in the folder hierarchy
		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.where('folder.id = :folderId', { folderId });

		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.innerJoin('folder_path', 'fp', 'f.parentFolderId = fp.id');

		const activeWorkflowCountQuery = this.workflowRepository
			.createQueryBuilder('workflow')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.select('COUNT(workflow.id)', 'count')
			.where('workflow.active = :active', { active: true })
			.andWhere('workflow.isArchived = :isArchived', { isArchived: false })
			.andWhere((qb) => {
				const folderQuery = qb.subQuery().from('folder_path', 'fp').select('fp.id').getQuery();
				return `workflow.parentFolderId IN ${folderQuery}`;
			})
			.setParameters({ folderId });

		// Get folder depth
		const path = await this.getFolderPath(folderId, projectId);
		const depth = path.length;

		// Get last modified date from workflows
		const lastModifiedQuery = this.workflowRepository
			.createQueryBuilder('workflow')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.select('MAX(workflow.updatedAt)', 'lastModified')
			.where((qb) => {
				const folderQuery = qb.subQuery().from('folder_path', 'fp').select('fp.id').getQuery();
				return `workflow.parentFolderId IN ${folderQuery}`;
			})
			.setParameters({ folderId });

		const [activeWorkflowResult, lastModifiedResult] = await Promise.all([
			activeWorkflowCountQuery.getRawOne<{ count: string }>(),
			lastModifiedQuery.getRawOne<{ lastModified: Date }>(),
		]);

		return {
			totalSubFolders,
			totalWorkflows,
			activeWorkflows: parseInt(activeWorkflowResult?.count ?? '0', 10),
			totalSize: 0, // Could be implemented to calculate actual storage size
			lastModified: lastModifiedResult?.lastModified || new Date(),
			depth,
		};
	}
}
