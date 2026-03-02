import { Service } from '@n8n/di';
import {
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { In } from '@n8n/typeorm';

import { UserFavoriteRepository } from './database/repositories/user-favorite.repository';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';

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

	async getEnrichedFavorites(userId: string) {
		const favorites = await this.userFavoriteRepository.findByUser(userId);
		if (favorites.length === 0) return [];

		const workflowIds = favorites
			.filter((f) => f.resourceType === 'workflow')
			.map((f) => f.resourceId);
		const dataTableIds = favorites
			.filter((f) => f.resourceType === 'dataTable')
			.map((f) => f.resourceId);
		const folderIds = favorites.filter((f) => f.resourceType === 'folder').map((f) => f.resourceId);

		// Get accessible projects for user
		const accessibleProjects = await this.projectRepository.getAccessibleProjects(userId);
		const accessibleProjectIds = new Set(accessibleProjects.map((p) => p.id));
		const projectNameMap = new Map(accessibleProjects.map((p) => [p.id, p.name ?? '']));

		// Workflow enrichment with access control
		const workflowNameMap = new Map<string, string>();
		if (workflowIds.length > 0 && accessibleProjectIds.size > 0) {
			const workflows = await this.workflowRepository.findByIds(workflowIds, {
				fields: ['id', 'name'],
			});
			const wfMap = new Map(workflows.map((wf) => [wf.id, wf.name]));

			// Check access via SharedWorkflow
			const sharedWorkflows = await this.sharedWorkflowRepository.find({
				select: { workflowId: true },
				where: { workflowId: In(workflowIds), projectId: In([...accessibleProjectIds]) },
			});
			const accessibleWfIds = new Set(sharedWorkflows.map((sw) => sw.workflowId));

			for (const id of workflowIds) {
				const name = wfMap.get(id);
				if (accessibleWfIds.has(id) && name !== undefined) {
					workflowNameMap.set(id, name);
				}
			}
		}

		// Data table enrichment with access control
		const dataTableMetaMap = new Map<string, { name: string; projectId: string }>();
		if (dataTableIds.length > 0) {
			const dataTables = await this.dataTableRepository.find({
				where: { id: In(dataTableIds) },
			});
			for (const dt of dataTables) {
				if (accessibleProjectIds.has(dt.projectId)) {
					dataTableMetaMap.set(dt.id, { name: dt.name, projectId: dt.projectId });
				}
			}
		}

		// Folder enrichment with access control
		const folderMetaMap = new Map<string, { name: string; projectId: string }>();
		if (folderIds.length > 0) {
			const folders = await this.folderRepository.find({
				where: { id: In(folderIds) },
				relations: { homeProject: true },
			});
			for (const folder of folders) {
				const projectId = folder.homeProject?.id;
				if (projectId && accessibleProjectIds.has(projectId)) {
					folderMetaMap.set(folder.id, { name: folder.name, projectId });
				}
			}
		}

		// Build enriched result, filtering out inaccessible resources
		const enriched: Array<
			(typeof favorites)[0] & { resourceName: string; resourceProjectId?: string }
		> = [];

		for (const fav of favorites) {
			if (fav.resourceType === 'workflow') {
				const name = workflowNameMap.get(fav.resourceId);
				if (name !== undefined) enriched.push({ ...fav, resourceName: name });
			} else if (fav.resourceType === 'project') {
				const name = projectNameMap.get(fav.resourceId);
				if (name !== undefined) {
					enriched.push({ ...fav, resourceName: name });
				}
			} else if (fav.resourceType === 'dataTable') {
				const meta = dataTableMetaMap.get(fav.resourceId);
				if (meta !== undefined) {
					enriched.push({ ...fav, resourceName: meta.name, resourceProjectId: meta.projectId });
				}
			} else if (fav.resourceType === 'folder') {
				const meta = folderMetaMap.get(fav.resourceId);
				if (meta !== undefined) {
					enriched.push({ ...fav, resourceName: meta.name, resourceProjectId: meta.projectId });
				}
			}
		}

		return enriched;
	}

	async addFavorite(userId: string, resourceId: string, resourceType: string) {
		const existing = await this.userFavoriteRepository.findOne({
			where: { userId, resourceId, resourceType },
		});

		if (existing) return existing;

		const count = await this.userFavoriteRepository.count({ where: { userId } });
		if (count >= this.MAX_FAVORITES) {
			throw new BadRequestError(`Favorites limit of ${this.MAX_FAVORITES} reached`);
		}

		const favorite = this.userFavoriteRepository.create({ userId, resourceId, resourceType });
		return await this.userFavoriteRepository.save(favorite);
	}

	async removeFavorite(userId: string, resourceId: string, resourceType: string) {
		const favorite = await this.userFavoriteRepository.findOne({
			where: { userId, resourceId, resourceType },
		});

		if (!favorite) {
			throw new NotFoundError('Favorite not found');
		}

		await this.userFavoriteRepository.remove(favorite);
	}

	async deleteByResource(resourceId: string, resourceType: string): Promise<void> {
		await this.userFavoriteRepository.deleteByResourceId(resourceId, resourceType);
	}

	async deleteByResourceIds(resourceIds: string[], resourceType: string): Promise<void> {
		await this.userFavoriteRepository.deleteByResourceIds(resourceIds, resourceType);
	}
}
