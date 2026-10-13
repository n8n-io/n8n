import type { Folder, OperationContext, User } from '@n8n/db';
import { FolderAccessRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { RoleService } from './role.service';

/**
 * Resolves folders by id for a user, enforcing access through the folder's home
 * project. Mirrors {@link WorkflowFinderService.findWorkflowsByIdsForUser}:
 * folders the user cannot access are simply omitted from the result, leaving
 * the caller to decide how to treat the gap (the exporter aborts on any miss).
 */
@Service()
export class FolderFinderService {
	constructor(
		private readonly folderAccessRepository: FolderAccessRepository,
		private readonly roleService: RoleService,
	) {}

	async findExistingFolderIds(
		folderIds: string[],
		ctx: OperationContext = {},
	): Promise<Set<string>> {
		if (folderIds.length === 0) return new Set();

		return await this.folderAccessRepository.findExistingFolderIds(folderIds, ctx);
	}

	/**
	 * Resolves a folder id to itself plus, optionally, its descendant ids, with
	 * **no access check** — unlike every `*ForUser` method on this class.
	 *
	 * Contract for callers: the returned ids may only be used to *narrow* a query
	 * that already restricts rows to what the user may read, and must never be
	 * returned to the caller or used to decide whether a folder may be touched.
	 * Under that contract the absent check discloses nothing, because the calling
	 * query still decides every visible row. Anything that hands folder data back
	 * belongs on {@link findFoldersByIdsForUser} or
	 * {@link findFolderSubtreesForUser} instead.
	 *
	 * The absent check is required, not merely tolerated. It mirrors the workflow
	 * list endpoint, which filters by `parentFolderId` with no folder permission at
	 * all and gates only the *returning* of folder rows behind `folder:list`. A
	 * per-user check here would also break the round trip the filter exists for: a
	 * workflow shared into someone's personal project keeps the parent folder of
	 * its *home* project, so a member who may read the workflow — and who was just
	 * handed its `parentFolderId` — usually has no relation to the project holding
	 * that folder.
	 *
	 * Returns an empty array for a folder that does not exist, so callers can tell
	 * an unknown id apart from a folder holding nothing.
	 */
	async findFolderFilterIdsWithoutAccessCheck(
		folderId: string,
		includeDescendants: boolean,
		ctx: OperationContext = {},
	): Promise<string[]> {
		const existing = await this.findExistingFolderIds([folderId], ctx);
		if (!existing.has(folderId)) return [];
		if (!includeDescendants) return [folderId];

		const descendantIds = await this.folderAccessRepository.findDescendantIds([folderId], ctx);
		return [folderId, ...descendantIds];
	}

	async findFoldersByIdsForUser(
		folderIds: string[],
		user: User,
		scopes: Scope[],
		ctx: OperationContext = {},
	): Promise<Folder[]> {
		if (folderIds.length === 0) return [];

		const access = hasGlobalScope(user, scopes, { mode: 'allOf' })
			? null
			: {
					userId: user.id,
					projectRoles: await this.roleService.rolesWithScope(
						'project',
						scopes,
						async () => await this.folderAccessRepository.findRolesForAccessCheck(ctx),
					),
				};
		return await this.folderAccessRepository.findFoldersByIdsForUser(folderIds, access, ctx);
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
		ctx: OperationContext = {},
	): Promise<Folder[]> {
		if (folderIds.length === 0) return [];

		// One recursive query for every requested subtree, rather than one per id.
		const descendantIds = await this.folderAccessRepository.findDescendantIds(folderIds, ctx);
		const allFolderIds = [...new Set([...folderIds, ...descendantIds])];

		return await this.findFoldersByIdsForUser(allFolderIds, user, scopes, ctx);
	}

	async findFolderAncestorChainsForUser(
		folderIds: string[],
		user: User,
		scopes: Scope[],
		ctx: OperationContext = {},
	): Promise<Map<string, Folder[]>> {
		if (folderIds.length === 0) return new Map();

		const foldersById = new Map<string, Folder>();
		let currentIds = [...new Set(folderIds)];

		while (currentIds.length > 0) {
			const folders = await this.findFoldersByIdsForUser(currentIds, user, scopes, ctx);
			for (const folder of folders) {
				foldersById.set(folder.id, folder);
			}

			currentIds = [
				...new Set(
					folders
						.map((folder) => folder.parentFolderId)
						.filter((id): id is string => id !== null && !foldersById.has(id)),
				),
			];
		}

		const chainsByFolderId = new Map<string, Folder[]>();
		for (const folderId of folderIds) {
			const chain: Folder[] = [];
			let current = foldersById.get(folderId);
			while (current) {
				chain.unshift(current);
				current = current.parentFolderId ? foldersById.get(current.parentFolderId) : undefined;
			}
			if (chain.length > 0) {
				chainsByFolderId.set(folderId, chain);
			}
		}

		return chainsByFolderId;
	}

	/**
	 * List all folder ids in a project
	 */
	async findFolderIdsInProject(projectId: string, ctx: OperationContext = {}): Promise<string[]> {
		return await this.folderAccessRepository.findFolderIdsInProject(projectId, ctx);
	}
}
