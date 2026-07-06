import type { Folder, User } from '@n8n/db';
import { FolderRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

/**
 * Resolves folders by id for a user, enforcing access through the folder's home
 * project. Mirrors {@link WorkflowFinderService.findWorkflowsByIdsForUser}:
 * folders the user cannot access are simply omitted from the result, leaving
 * the caller to decide how to treat the gap (the exporter aborts on any miss).
 */
@Service()
export class FolderFinderService {
	constructor(
		private readonly folderRepository: FolderRepository,
		private readonly roleService: RoleService,
	) {}

	async findFoldersByIdsForUser(
		folderIds: string[],
		user: User,
		scopes: Scope[],
	): Promise<Folder[]> {
		if (folderIds.length === 0) return [];

		const accessWhere = await this.buildFolderReadWhere(user, scopes);

		return await this.folderRepository.find({
			where: { id: In(folderIds), ...accessWhere },
		});
	}

	/**
	 * Resolves each requested folder together with all of its descendant folders
	 * (the subtree to export). Descendants share their ancestor's project, so the
	 * same access check authorizes the whole set in one query; an inaccessible
	 * requested folder is dropped here and the caller aborts on the gap.
	 */
	async findFolderSubtreesForUser(
		folderIds: string[],
		user: User,
		scopes: Scope[],
	): Promise<Folder[]> {
		if (folderIds.length === 0) return [];

		// One recursive query for every requested subtree, rather than one per id.
		const descendantIds = await this.folderRepository.getAllFolderIdsInSubtrees(folderIds);
		const allFolderIds = [...new Set([...folderIds, ...descendantIds])];

		return await this.findFoldersByIdsForUser(allFolderIds, user, scopes);
	}

	/**
	 * List all folder ids in a project
	 */
	async findFolderIdsInProject(projectId: string): Promise<string[]> {
		const folders = await this.folderRepository.find({
			where: { homeProject: { id: projectId } },
			select: { id: true },
		});
		return folders.map((folder) => folder.id);
	}

	private async buildFolderReadWhere(
		user: User,
		scopes: Scope[],
	): Promise<FindOptionsWhere<Folder>> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return {};

		const projectRoles = await this.roleService.rolesWithScope('project', scopes);

		return {
			homeProject: {
				projectRelations: {
					role: In(projectRoles),
					userId: user.id,
				},
			},
		};
	}
}
