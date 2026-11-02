import type {
	User,
	WorkflowAccessRoles,
	WorkflowEntity,
	WorkflowHead,
	WorkflowFolderPlacement,
	ListQuery,
	PublishHistoryScope,
	OperationContext,
} from '@n8n/db';
import { FolderRepository, WorkflowAccessRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type AuthPrincipal, type Scope } from '@n8n/permissions';

import { userHasScopes } from '../permissions.ee/check-access';
import { RoleService } from '../services/role.service';

export type FindWorkflowsForUserOptions = {
	filters?: {
		name?: string;
		active?: boolean;
		tagNames?: string[];
		folderId?: string;
		projectId?: string;
	};
	offset?: number;
	limit?: number;
	includePinnedData?: boolean;
	includeTags?: boolean;
	includeProjects?: boolean;
	includeActiveVersion?: boolean;
	includeParentFolder?: boolean;
};

@Service()
export class WorkflowFinderService {
	constructor(
		private readonly workflowAccessRepository: WorkflowAccessRepository,
		private readonly folderRepository: FolderRepository,
		private readonly roleService: RoleService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async findWorkflowForUser(
		workflowId: string,
		user: User,
		scopes: Scope[],
		options: {
			includeTags?: boolean;
			includeParentFolder?: boolean;
			includeActiveVersion?: boolean;
			publishHistory?: PublishHistoryScope;
			ctx?: OperationContext;
		} = {},
	) {
		const { ctx, ...include } = options;
		const access = await this.resolveAccessRoles(user, scopes, ctx);
		return await this.workflowAccessRepository.findWorkflowForUser(
			workflowId,
			access,
			include,
			ctx,
		);
	}

	/**
	 * Read-access check that projects only `versionId` and `updatedAt` from the
	 * workflow row — skips the heavyweight `nodes`/`connections`/`settings` JSON
	 * columns. Use for cache-validity checks where the body isn't needed.
	 */
	async findWorkflowHeadForUser(
		workflowId: string,
		user: User,
		scopes: Scope[],
	): Promise<WorkflowHead | null> {
		const access = await this.resolveAccessRoles(user, scopes);
		return await this.workflowAccessRepository.findWorkflowHeadForUser(workflowId, access);
	}

	/** Returns `null` when a global scope gives access to all workflows. */
	private async resolveAccessRoles(
		user: AuthPrincipal & Pick<User, 'id'>,
		scopes: Scope[],
		ctx?: OperationContext,
	): Promise<WorkflowAccessRoles> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return null;
		const loadRoles = ctx
			? async () => await this.workflowAccessRepository.findRolesForAccessCheck(ctx)
			: undefined;
		const rolesWithScope = async (namespace: 'project' | 'workflow') =>
			loadRoles
				? await this.roleService.rolesWithScope(namespace, scopes, loadRoles)
				: await this.roleService.rolesWithScope(namespace, scopes);

		const [projectRoles, workflowRoles] = await Promise.all([
			rolesWithScope('project'),
			rolesWithScope('workflow'),
		]);
		return { userId: user.id, projectRoles, workflowRoles };
	}

	async findWorkflowIdsWithScopeForUser(
		workflowIds: string[],
		user: AuthPrincipal & Pick<User, 'id'>,
		scopes: Scope[],
		projectId?: string,
	): Promise<Set<string>> {
		if (workflowIds.length === 0) return new Set();
		const access = await this.resolveAccessRoles(user, scopes);
		return await this.workflowAccessRepository.findAccessibleWorkflowIds(
			workflowIds,
			access,
			projectId,
		);
	}

	async findExistingWorkflowIds(workflowIds: string[]): Promise<Set<string>> {
		if (workflowIds.length === 0) return new Set();

		const workflows = await this.workflowRepository.findByIds(workflowIds, { fields: ['id'] });
		return new Set(workflows.map(({ id }) => id));
	}

	async findWorkflowsByIdsForUser(
		workflowIds: string[],
		user: User,
		scopes: Scope[],
		options: {
			includeParentFolder?: boolean;
			includeTags?: boolean;
			includeActiveVersion?: boolean;
		} = {},
	): Promise<WorkflowEntity[]> {
		if (workflowIds.length === 0) return [];

		const access = await this.resolveAccessRoles(user, scopes);
		return await this.workflowAccessRepository.findWorkflowsByIdsForUser(workflowIds, access, {
			parentFolder: options.includeParentFolder,
			tags: options.includeTags,
			activeVersion: options.includeActiveVersion,
		});
	}

	async findWorkflowIdsByFolder(
		folderIds: string[],
		options: { includeArchived?: boolean } = {},
	): Promise<Map<string, string[]>> {
		if (folderIds.length === 0) return new Map();

		const placements = await this.workflowAccessRepository.findWorkflowParentFolderIds(
			folderIds,
			options.includeArchived ?? false,
		);

		const byFolder = new Map<string, string[]>();
		const seen = new Set<string>();
		for (const { workflowId, parentFolderId } of placements) {
			// A workflow may appear via several share rows; dedupe so it lands once.
			if (!parentFolderId || seen.has(workflowId)) continue;
			seen.add(workflowId);
			const list = byFolder.get(parentFolderId) ?? [];
			list.push(workflowId);
			byFolder.set(parentFolderId, list);
		}

		return byFolder;
	}

	async findOwnedWorkflowRemovalCandidates(
		projectId: string,
		workflowIds: string[],
		options: { includeArchived?: boolean } = {},
	) {
		return await this.workflowAccessRepository.findOwnedWorkflowRemovalCandidates(
			projectId,
			workflowIds,
			options,
		);
	}

	/**
	 * Workflows a project owns, each paired with the folder holding it (`null` at the
	 * project root). Archived workflows are excluded unless asked for; a reconciling
	 * caller includes them so a folder holding only archived work still reads as occupied.
	 *
	 * The widest of the three scope lookups here — use {@link findRootWorkflowIdsInProject} when
	 * only the project root matters, or {@link findWorkflowIdsByFolder} for folders that need not
	 * belong to one project. For explicit removals, use {@link findOwnedWorkflowRemovalCandidates}.
	 */
	async findOwnedWorkflowPlacementsInProject(
		projectId: string,
		options: { includeArchived?: boolean } = {},
	): Promise<WorkflowFolderPlacement[]> {
		return await this.workflowAccessRepository.findOwnedWorkflowPlacementsInProject(
			projectId,
			options.includeArchived ?? false,
		);
	}

	/**
	 * List root workflows of a project only.
	 */
	async findRootWorkflowIdsInProject(
		projectId: string,
		options: { includeArchived?: boolean } = {},
	): Promise<string[]> {
		return await this.workflowAccessRepository.findRootWorkflowIdsInProject(
			projectId,
			options.includeArchived ?? false,
		);
	}

	/**
	 * Finds owned workflows in a project that may match package workflows either
	 * by `sourceWorkflowId` or, when unset, by local id (re-import of workflows
	 * authored on this instance). Archived workflows are left out unless
	 * `includeArchived` is set.
	 */
	async findOwnedWorkflowsBySourceWorkflowIds(
		projectId: string,
		sourceWorkflowIds: string[],
		options: {
			includeActiveVersion?: boolean;
			includeParentFolder?: boolean;
			includeArchived?: boolean;
		} = {},
	): Promise<WorkflowEntity[]> {
		if (sourceWorkflowIds.length === 0) return [];

		return await this.workflowAccessRepository.findOwnedWorkflowsBySourceWorkflowIds(
			projectId,
			sourceWorkflowIds,
			options,
		);
	}

	async hasProjectScopeForUser(user: User, scopes: Scope[], projectId: string) {
		return await userHasScopes(user, scopes, false, { projectId });
	}

	async findProjectIdForFolder(folderId: string): Promise<string | null> {
		return await this.workflowAccessRepository.findFolderProjectId(folderId);
	}

	async findAllWorkflowIdsForUser(
		user: User,
		scopes: Scope[],
		folderId?: string,
		projectId?: string,
	) {
		const parentFolderIds = folderId
			? [folderId, ...(await this.folderRepository.getAllFolderIdsInHierarchy(folderId, projectId))]
			: undefined;
		const access = await this.resolveAccessRoles(user, scopes);
		return await this.workflowAccessRepository.findWorkflowIdsForUser(access, {
			projectId,
			parentFolderIds,
		});
	}

	/**
	 * Scope-aware workflow list. Supports optional folder/project scoping,
	 * name/active/tag filters, and pagination. Omit `limit` for an unpaginated result.
	 */
	async findWorkflowsForUser(
		user: User,
		scopes: Scope[],
		options: FindWorkflowsForUserOptions = {},
	): Promise<{ workflows: WorkflowEntity[]; count: number }> {
		const {
			filters = {},
			offset = 0,
			limit,
			includePinnedData = false,
			includeTags = false,
			includeProjects = false,
			includeActiveVersion = false,
			includeParentFolder = false,
		} = options;
		const { name, active, tagNames, folderId, projectId } = filters;

		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', scopes),
			this.roleService.rolesWithScope('workflow', scopes),
		]);

		const parentFolderIds = folderId
			? [folderId, ...(await this.folderRepository.getAllFolderIdsInHierarchy(folderId, projectId))]
			: undefined;

		// oxlint-disable-next-line typescript/no-deprecated
		const select: NonNullable<ListQuery.Options['select']> = {
			id: true,
			name: true,
			active: true,
			activeVersionId: true,
			createdAt: true,
			updatedAt: true,
			isArchived: true,
			nodes: true,
			connections: true,
			nodeGroups: true,
			settings: true,
			staticData: true,
			meta: true,
			versionId: true,
			triggerCount: true,
			// ListQuery select keys: `ownedBy` = share rows + project relation (nested);
			// `shared` = share rows only without project relation.
			...(includeProjects ? { ownedBy: true } : { shared: true }),
			...(includeActiveVersion && { activeVersion: true }),
			...(includePinnedData && { pinData: true }),
			...(includeTags && { tags: true }),
			...(includeParentFolder && { parentFolder: true }),
		};

		const { workflows, count } = await this.workflowRepository.getManyAndCountWithSharingSubquery(
			user,
			{ scopes, projectRoles, workflowRoles },
			{
				filter: {
					...(name !== undefined && { name }),
					...(active !== undefined && { active }),
					...(tagNames?.length && { tags: tagNames }),
					...(projectId && { projectId }),
					...(parentFolderIds && { parentFolderIds }),
				},
				select,
				sortBy: 'id:asc',
				...(limit !== undefined && { skip: offset, take: limit }),
			},
		);

		return { workflows, count };
	}
}
