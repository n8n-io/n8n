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
import { Folder, FolderTagMappingRepository, FolderRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { PROJECT_ROOT } from 'n8n-workflow';
import { BadRequestError, NotFoundError, UserError } from '@n8n/errors';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import type { ListQuery } from '@/requests';
import { FolderContentService } from './folder-content.service';

export interface SimpleFolderNode {
	id: string;
	name: string;
	children: SimpleFolderNode[];
}

@Service()
export class FolderService {
	constructor(
		private readonly folderRepository: FolderRepository,
		private readonly folderTagMappingRepository: FolderTagMappingRepository,
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

	async assertContentAccess(
		user: User,
		folderId: string,
		projectId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<void> {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);

		await this.folderContentService
			.getHandler(folder.resourceType)
			.assertAccess?.(user, projectId, operation);
	}

	async assertAgentContentAccess(
		user: User,
		projectId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<void> {
		await this.folderContentService.getHandler('agent').assertAccess?.(user, projectId, operation);
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

	/** The folders from the top of the project down to `folderId`. */
	async getFolderPath(folderId: string, projectId: string): Promise<Folder[]> {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);

		return await this.folderRepository.getAncestorPath(folderId, projectId, folder.resourceType);
	}

	async getFolderPathsToRoot(folderIds: string[]): Promise<Map<string, string[]>> {
		return await this.folderRepository.getFolderPathsToRoot(folderIds);
	}

	async getFolderTree(folderId: string, projectId: string): Promise<SimpleFolderNode[]> {
		const path = await this.getFolderPath(folderId, projectId);
		const root = path[0];

		if (root?.parentFolderId && path.some(({ id }) => id === root.parentFolderId)) {
			return [];
		}

		return path.reduceRight<SimpleFolderNode[]>(
			(children, { id, name }) => [{ id, name, children }],
			[],
		);
	}

	async deleteFolder(
		user: User,
		folderId: string,
		projectId: string,
		{ transferToFolderId }: DeleteFolderDto,
	): Promise<FolderResourceType> {
		const folder = await this.findFolderInProjectOrFail(folderId, projectId);
		const handler = this.folderContentService.getHandler(folder.resourceType);
		await handler.assertAccess?.(user, projectId, transferToFolderId ? 'update' : 'delete');

		if (transferToFolderId) {
			await this.validateRelocation(folder, projectId, transferToFolderId);
			const destination = transferToFolderId === PROJECT_ROOT ? null : transferToFolderId;

			await this.transactionRunner.run({}, async (ctx) => {
				await handler.relocate(projectId, folder.id, destination, ctx);
				await this.folderRepository.relocateChildrenAndDelete(
					folder.id,
					projectId,
					folder.resourceType,
					destination,
					ctx,
				);
			});
		} else {
			const descendants = await this.folderRepository.getAllFolderIdsInHierarchy(
				folder.id,
				projectId,
				folder.resourceType,
			);
			const folderIds = [folder.id, ...descendants];
			await handler.archiveContents(user, projectId, folderIds);

			await this.transactionRunner.run({}, async (ctx) => {
				await handler.moveArchivedToRoot(projectId, folderIds, ctx);
				await this.folderRepository.deleteFolderSubtree(
					folder.id,
					projectId,
					folder.resourceType,
					ctx,
				);
			});
		}

		this.eventService.emit('folder-deleted', { folderId: folder.id, projectId });

		return folder.resourceType;
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

	async transferAllFoldersToProject(
		fromProjectId: string,
		toProjectId: string,
		tx?: EntityManager,
	) {
		return await this.folderRepository.transferAllFoldersToProject(fromProjectId, toProjectId, tx);
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

		const descendants = await this.folderRepository.getAllFolderIdsInHierarchy(
			folderId,
			projectId,
			folder.resourceType,
		);
		const counts = await this.folderContentService
			.getHandler(folder.resourceType)
			.directCounts(projectId, [folderId, ...descendants]);
		const totalContents = [...counts.values()].reduce((total, count) => total + count, 0);

		return {
			folder,
			totalSubFolders: descendants.length,
			totalWorkflows: folder.resourceType === 'workflow' ? totalContents : 0,
			totalAgents: folder.resourceType === 'agent' ? totalContents : 0,
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
			const counts = await this.folderContentService.getHandler('agent').directCounts(
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
