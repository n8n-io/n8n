import type { CreateFolderDto, DeleteFolderDto, UpdateFolderDto } from '@n8n/api-types';
import type {
	FolderWithWorkflowAndSubFolderCount,
	FolderWithWorkflowAndSubFolderCountAndPath,
	User,
} from '@n8n/db';
import { Folder, FolderTagMappingRepository, FolderRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
import { UserError, PROJECT_ROOT } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import type { ListQuery } from '@/requests';
// eslint-disable-next-line import-x/no-cycle
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
}
