import { Service } from '@n8n/di';
import {
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { In } from '@n8n/typeorm';

import { UserFavoriteRepository } from './database/repositories/user-favorite.repository';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { FavoriteResourceType } from '@n8n/api-types';

type ResourceMeta = { name: string; projectId: string };

type Favorite = { resourceId: string; resourceType: FavoriteResourceType };

const idsOfType = (favorites: Favorite[], type: FavoriteResourceType): string[] =>
	favorites.filter((f) => f.resourceType === type).map((f) => f.resourceId);

const enrichWithName = <F>(
	fav: F,
	name: string | undefined,
): Array<F & { resourceName: string }> =>
	name === undefined ? [] : [{ ...fav, resourceName: name }];

const enrichWithMeta = <F>(
	fav: F,
	meta: ResourceMeta | undefined,
): Array<F & { resourceName: string; resourceProjectId: string }> =>
	meta === undefined
		? []
		: [{ ...fav, resourceName: meta.name, resourceProjectId: meta.projectId }];

@Service()
export class FavoritesService {
	private readonly MAX_FAVORITES = 200;
	constructor(
		private readonly userFavoriteRepository: UserFavoriteRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
		private readonly folderRepository: FolderRepository,
	) {}

	async getEnrichedFavorites(user: User) {
		const favorites = await this.userFavoriteRepository.findByUser(user.id);
		if (favorites.length === 0) return [];

		const ids = {
			workflow: idsOfType(favorites, 'workflow'),
			project: idsOfType(favorites, 'project'),
			dataTable: idsOfType(favorites, 'dataTable'),
			folder: idsOfType(favorites, 'folder'),
		};

		const accessibleProjects = await this.projectRepository.getAccessibleProjects(user.id);
		const accessibleProjectIds = new Set(accessibleProjects.map((p) => p.id));

		const [workflowNames, projectNames, dataTableMeta, folderMeta] = await Promise.all([
			this.enrichWorkflowFavorites(user, ids.workflow, accessibleProjectIds),
			this.enrichProjectFavorites(user, ids.project, accessibleProjects),
			this.enrichDataTableFavorites(user, ids.dataTable, accessibleProjectIds),
			this.enrichFolderFavorites(user, ids.folder, accessibleProjectIds),
		]);

		return favorites.flatMap((fav) => {
			switch (fav.resourceType) {
				case 'workflow':
					return enrichWithName(fav, workflowNames.get(fav.resourceId));
				case 'project':
					return enrichWithName(fav, projectNames.get(fav.resourceId));
				case 'dataTable':
					return enrichWithMeta(fav, dataTableMeta.get(fav.resourceId));
				case 'folder':
					return enrichWithMeta(fav, folderMeta.get(fav.resourceId));
				default:
					return [];
			}
		});
	}

	private async enrichWorkflowFavorites(
		user: User,
		workflowIds: string[],
		accessibleProjectIds: Set<string>,
	): Promise<Map<string, string>> {
		const result = new Map<string, string>();
		if (workflowIds.length === 0) return result;

		const hasGlobalAccess = hasGlobalScope(user, 'workflow:read');
		if (!hasGlobalAccess && accessibleProjectIds.size === 0) return result;

		const [workflows, sharedWorkflows] = await Promise.all([
			this.workflowRepository.findByIds(workflowIds, { fields: ['id', 'name'] }),
			hasGlobalAccess
				? Promise.resolve([])
				: this.sharedWorkflowRepository.find({
						select: { workflowId: true },
						where: { workflowId: In(workflowIds), projectId: In([...accessibleProjectIds]) },
					}),
		]);

		const accessibleIds = hasGlobalAccess
			? new Set(workflows.map((wf) => wf.id))
			: new Set(sharedWorkflows.map((sw) => sw.workflowId));

		for (const wf of workflows) {
			if (accessibleIds.has(wf.id)) result.set(wf.id, wf.name);
		}
		return result;
	}

	private async enrichProjectFavorites(
		user: User,
		projectFavoriteIds: string[],
		accessibleProjects: Project[],
	): Promise<Map<string, string>> {
		const result = new Map(accessibleProjects.map((p) => [p.id, p.name ?? '']));
		if (projectFavoriteIds.length === 0) return result;

		if (!hasGlobalScope(user, 'project:read')) return result;

		const missingIds = projectFavoriteIds.filter((id) => !result.has(id));
		if (missingIds.length === 0) return result;

		const additional = await this.projectRepository.find({
			where: { id: In(missingIds) },
			select: { id: true, name: true },
		});
		for (const p of additional) {
			result.set(p.id, p.name ?? '');
		}
		return result;
	}

	private async enrichDataTableFavorites(
		user: User,
		dataTableIds: string[],
		accessibleProjectIds: Set<string>,
	): Promise<Map<string, ResourceMeta>> {
		const result = new Map<string, ResourceMeta>();
		if (dataTableIds.length === 0) return result;

		const hasGlobalAccess = hasGlobalScope(user, 'dataTable:read');
		const dataTables = await this.dataTableRepository.find({ where: { id: In(dataTableIds) } });

		for (const dt of dataTables) {
			if (hasGlobalAccess || accessibleProjectIds.has(dt.projectId)) {
				result.set(dt.id, { name: dt.name, projectId: dt.projectId });
			}
		}
		return result;
	}

	private async enrichFolderFavorites(
		user: User,
		folderIds: string[],
		accessibleProjectIds: Set<string>,
	): Promise<Map<string, ResourceMeta>> {
		const result = new Map<string, ResourceMeta>();
		if (folderIds.length === 0) return result;

		const hasGlobalAccess = hasGlobalScope(user, 'folder:read');
		const folders = await this.folderRepository.find({
			where: { id: In(folderIds) },
			relations: { homeProject: true },
		});

		for (const folder of folders) {
			const projectId = folder.homeProject?.id;
			if (projectId && (hasGlobalAccess || accessibleProjectIds.has(projectId))) {
				result.set(folder.id, { name: folder.name, projectId });
			}
		}
		return result;
	}

	async addFavorite(userId: string, resourceId: string, resourceType: FavoriteResourceType) {
		const existing = await this.userFavoriteRepository.findOne({
			where: { userId, resourceId, resourceType },
		});

		if (existing) return existing;

		await this.assertResourceExists(resourceId, resourceType);

		const count = await this.userFavoriteRepository.count({ where: { userId } });
		if (count >= this.MAX_FAVORITES) {
			throw new BadRequestError(`Favorites limit of ${this.MAX_FAVORITES} reached`);
		}

		const favorite = this.userFavoriteRepository.create({ userId, resourceId, resourceType });
		return await this.userFavoriteRepository.save(favorite);
	}

	private async assertResourceExists(
		resourceId: string,
		resourceType: FavoriteResourceType,
	): Promise<void> {
		let exists: boolean;

		switch (resourceType) {
			case 'workflow':
				exists = await this.workflowRepository.existsBy({ id: resourceId });
				break;
			case 'project':
				exists = await this.projectRepository.existsBy({ id: resourceId });
				break;
			case 'dataTable':
				exists = await this.dataTableRepository.existsBy({ id: resourceId });
				break;
			case 'folder':
				exists = await this.folderRepository.existsBy({ id: resourceId });
				break;
		}

		if (!exists) {
			throw new NotFoundError(`${resourceType} with id "${resourceId}" not found`);
		}
	}

	async removeFavorite(userId: string, resourceId: string, resourceType: FavoriteResourceType) {
		const favorite = await this.userFavoriteRepository.findOne({
			where: { userId, resourceId, resourceType },
		});

		if (!favorite) {
			throw new NotFoundError('Favorite not found');
		}

		await this.userFavoriteRepository.remove(favorite);
	}

	async deleteByResource(resourceId: string, resourceType: FavoriteResourceType): Promise<void> {
		await this.userFavoriteRepository.deleteByResourceId(resourceId, resourceType);
	}

	async deleteByResourceIds(
		resourceIds: string[],
		resourceType: FavoriteResourceType,
	): Promise<void> {
		await this.userFavoriteRepository.deleteByResourceIds(resourceIds, resourceType);
	}
}
