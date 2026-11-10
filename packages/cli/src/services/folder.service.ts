import { folderNameSchema } from '@n8n/api-types';
import type {
	CreateFolderDto,
	DeleteFolderDto,
	FolderResourceType,
	UpdateFolderDto,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import type {
	FolderWithWorkflowAndSubFolderCount,
	FolderWithWorkflowAndSubFolderCountAndPath,
	User,
} from '@n8n/db';
import {
	Folder,
	FolderTagMappingRepository,
	FolderRepository,
	TransactionRunner,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { PROJECT_ROOT } from 'n8n-workflow';
import { BadRequestError, NotFoundError, UserError } from '@n8n/errors';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import type { ListQuery } from '@/requests';
import { WorkflowService } from '@/workflows/workflow.service';
import { FolderContentService } from './folder-content.service';

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
		private readonly eventService: EventService,
		private readonly folderContentService: FolderContentService,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async createFolder(
		{
			parentFolderId,
			name,
			resourceType = 'workflow',
		}: Omit<CreateFolderDto, 'resourceType'> & { resourceType?: FolderResourceType },
		projectId: string,
		id?: string,
	) {
		name = folderNameSchema.parse(name);

		let parentFolder = null;

		if (parentFolderId && parentFolderId !== PROJECT_ROOT) {
			parentFolder = await this.findFolderInProjectOrFail(parentFolderId, projectId);
			this.assertResourceType(parentFolder, resourceType);
		}

		const folderEntity = this.folderRepository.create({
			...(id ? { id } : {}),
			name,
			resourceType,
			homeProject: { id: projectId },
			parentFolder,
		});

		const { homeProject, ...folder } = await this.folderRepository.save(folderEntity);

		return folder;
	}

	async getFoldersByIds(folderIds: string[]): Promise<Folder[]> {
		return await this.folderRepository.findManyByIds(folderIds);
	}

	/** Every workflow folder a project holds, with the parent each one sits under (`null` at the root). */
	async getFolderPlacementsInProject(
		projectId: string,
	): Promise<Array<{ id: string; name: string; parentFolderId: string | null }>> {
		const folders = await this.folderRepository.find({
			where: { homeProject: { id: projectId }, resourceType: 'workflow' },
			select: { id: true, name: true, parentFolderId: true },
		});

		return folders.map(({ id, name, parentFolderId }) => ({ id, name, parentFolderId }));
	}

	async updateFolder(
		folderId: string,
		projectId: string,
		{ name, tagIds, parentFolderId }: UpdateFolderDto,
	) {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);

		if (name !== undefined) {
			name = folderNameSchema.parse(name);
		}

		if (parentFolderId) {
			if (folderId === parentFolderId) {
				throw new UserError('Cannot set a folder as its own parent');
			}

			if (parentFolderId !== PROJECT_ROOT) {
				const parent = await this.findFolderInProjectOrFail(parentFolderId, projectId);
				this.assertResourceType(parent, folder.resourceType);

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

		if (name) {
			await this.folderRepository.update({ id: folderId }, { name });
		}

		if (tagIds) {
			await this.folderTagMappingRepository.overwriteTags(folderId, tagIds);
		}

		return await this.findFolderInProjectOrFail(folderId, projectId);
	}

	assertResourceType(folder: Folder, resourceType: FolderResourceType): void {
		if (folder.resourceType !== resourceType) {
			throw new UserError('The folder belongs to a different resource tree');
		}
	}

	async assertWorkflowFolder(folderId: string, projectId: string): Promise<void> {
		this.assertResourceType(await this.findFolderInProjectOrFail(folderId, projectId), 'workflow');
	}

	async assertContentAccess(
		user: User,
		folderId: string,
		projectId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<void> {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);

		if (folder.resourceType === 'agent') {
			await this.folderContentService.get('agent').assertAccess(user, projectId, operation);
		}
	}

	async assertAgentContentAccess(
		user: User,
		projectId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<void> {
		await this.folderContentService.get('agent').assertAccess(user, projectId, operation);
	}

	async validateDestination(
		folderId: string,
		projectId: string,
		resourceType: FolderResourceType,
	): Promise<void> {
		try {
			this.assertResourceType(
				await this.findFolderInProjectOrFail(folderId, projectId),
				resourceType,
			);
		} catch (error) {
			if (error instanceof FolderNotFoundError) {
				throw new NotFoundError(error.message);
			}

			if (error instanceof UserError) {
				throw new BadRequestError(error.message);
			}

			throw error;
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
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);
		const path = await this.folderRepository.getAncestorPath(
			folderId,
			projectId,
			folder.resourceType,
		);

		return this.transformFolderPathToTree(
			path.map((item) => ({
				folder_id: item.id,
				folder_name: item.name,
				folder_parent_folder_id: item.parentFolderId,
			})),
		);
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
			await this.workflowService.archive(user, workflowId, { skipArchived: true });
		}

		await this.workflowRepository.moveToFolder(workflowIds, PROJECT_ROOT);
	}

	async deleteFolder(
		user: User,
		folderId: string,
		projectId: string,
		{ transferToFolderId }: DeleteFolderDto,
	) {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);

		if (folder.resourceType === 'agent') {
			await this.deleteAgentFolder(user, folder, projectId, transferToFolderId);

			return;
		}

		if (!transferToFolderId) {
			await this.flattenAndArchive(user, folderId, projectId);
			await this.folderRepository.delete({ id: folderId });
			this.eventService.emit('folder-deleted', { folderId, projectId });
			return;
		}

		if (folderId === transferToFolderId) {
			throw new UserError('Cannot transfer folder contents to the folder being deleted');
		}

		if (transferToFolderId !== PROJECT_ROOT) {
			await this.validateRelocation(folder, projectId, transferToFolderId);
		}

		await this.folderRepository.manager.transaction(async (tx) => {
			await this.folderRepository.moveAllToFolder(folderId, transferToFolderId, tx);
			await this.workflowRepository.moveAllToFolder(folderId, transferToFolderId, tx);
			await tx.delete(Folder, { id: folderId });
		});
		this.eventService.emit('folder-deleted', { folderId, projectId });
	}

	private async validateRelocation(
		folder: Folder,
		projectId: string,
		targetId: string,
	): Promise<void> {
		if (targetId === folder.id) {
			throw new UserError('Cannot transfer folder contents to the folder being deleted');
		}

		if (targetId === PROJECT_ROOT) {
			return;
		}

		await this.validateDestination(targetId, projectId, folder.resourceType);
		const path = await this.getFolderTree(targetId, projectId);

		if (this.isDescendant(folder.id, path)) {
			throw new UserError('Cannot transfer folder contents to a descendant');
		}
	}

	private async deleteAgentFolder(
		user: User,
		folder: Folder,
		projectId: string,
		targetId?: string,
	): Promise<void> {
		const handler = this.folderContentService.get('agent');
		await handler.assertAccess(user, projectId, targetId ? 'update' : 'delete');

		if (targetId) {
			await this.validateRelocation(folder, projectId, targetId);
			const destination = targetId === PROJECT_ROOT ? null : targetId;

			await this.transactionRunner.run({}, async (ctx) => {
				await handler.relocate(projectId, folder.id, destination, ctx);
				await this.folderRepository.relocateChildrenAndDelete(
					folder.id,
					projectId,
					'agent',
					destination,
					ctx,
				);
			});
		} else {
			const descendants = await this.folderRepository.getAllFolderIdsInHierarchy(
				folder.id,
				projectId,
				'agent',
			);
			await handler.deleteContents(user, projectId, [folder.id, ...descendants]);
			await this.folderRepository.delete({
				id: folder.id,
				homeProject: { id: projectId },
				resourceType: 'agent',
			});
		}

		this.eventService.emit('folder-deleted', { folderId: folder.id, projectId });
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

	async findFolderWithContentCounts(
		folderId: string,
		projectId: string,
	): Promise<{
		folder: Folder;
		totalSubFolders: number;
		totalWorkflows: number;
		totalAgents: number;
	}> {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);

		if (folder.resourceType === 'agent') {
			const descendants = await this.folderRepository.getAllFolderIdsInHierarchy(
				folderId,
				projectId,
				'agent',
			);
			const totalAgents = await this.folderContentService
				.get('agent')
				.count(projectId, [folderId, ...descendants]);

			return { folder, totalSubFolders: descendants.length, totalWorkflows: 0, totalAgents };
		}

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
			folder,
			totalSubFolders: parseInt(subFolderResult?.count ?? '0', 10),
			totalWorkflows: parseInt(workflowResult?.count ?? '0', 10),
			totalAgents: 0,
		};
	}

	async getManyAndCount(
		projectId: string,
		options: ListQuery.Options & { resourceType?: FolderResourceType },
	): Promise<[FolderWithWorkflowAndSubFolderCountAndPath[], number]> {
		options.filter = {
			...options.filter,
			projectId,
			isArchived: false,
			resourceType: options.resourceType ?? 'workflow',
		};
		if (
			options.resourceType === 'agent' &&
			options.filter.name &&
			typeof options.filter.parentFolderId === 'string'
		) {
			const parentFolderId = options.filter.parentFolderId;
			delete options.filter.parentFolderId;

			if (parentFolderId !== PROJECT_ROOT) {
				await this.validateDestination(parentFolderId, projectId, 'agent');
				options.filter.folderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
					parentFolderId,
					projectId,
					'agent',
				);
			}
		}

		// eslint-disable-next-line prefer-const
		let [folders, count] = await this.folderRepository.getManyAndCount(options);
		if (options.resourceType === 'agent' && folders.length > 0) {
			const counts = await this.folderContentService.get('agent').directCounts(
				projectId,
				folders.map(({ id }) => id),
			);
			folders = folders.map((folder) =>
				Object.assign(folder, { agentCount: counts.get(folder.id) ?? 0 }),
			);
		}

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
