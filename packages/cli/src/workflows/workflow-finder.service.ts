import type { SharedWorkflow, User, WorkflowEntity, ListQuery } from '@n8n/db';
import { SharedWorkflowRepository, FolderRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import { In, IsNull } from '@n8n/typeorm';

import { userHasScopes } from '@/permissions.ee/check-access';
import { RoleService } from '@/services/role.service';

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
};

@Service()
export class WorkflowFinderService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
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
			em?: EntityManager;
		} = {},
	) {
		const where = await this.buildSingleWorkflowReadWhere(user, scopes, options.em);

		const sharedWorkflow = await this.sharedWorkflowRepository.findWorkflowWithOptions(workflowId, {
			where,
			includeTags: options.includeTags,
			includeParentFolder: options.includeParentFolder,
			includeActiveVersion: options.includeActiveVersion,
			em: options.em,
		});

		if (!sharedWorkflow) {
			return null;
		}

		return sharedWorkflow.workflow;
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
	): Promise<{ versionId: string; updatedAt: Date } | null> {
		const where = await this.buildSingleWorkflowReadWhere(user, scopes);
		const sw = await this.sharedWorkflowRepository.findOne({
			where: { workflowId, ...where },
			relations: { workflow: true },
			select: {
				workflowId: true,
				projectId: true,
				workflow: { id: true, versionId: true, updatedAt: true },
			},
		});
		if (!sw?.workflow) return null;
		return { versionId: sw.workflow.versionId, updatedAt: sw.workflow.updatedAt };
	}

	private async buildSingleWorkflowReadWhere(
		user: User,
		scopes: Scope[],
		em?: EntityManager,
	): Promise<FindOptionsWhere<SharedWorkflow>> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return {};

		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', scopes, em),
			this.roleService.rolesWithScope('workflow', scopes, em),
		]);

		return {
			role: In(workflowRoles),
			project: {
				projectRelations: {
					role: In(projectRoles),
					userId: user.id,
				},
			},
		};
	}

	private async findAllWhere(user: User, scopes: Scope[], folderId?: string, projectId?: string) {
		let where: FindOptionsWhere<SharedWorkflow> = {};

		if (folderId) {
			const subFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
				folderId,
				projectId,
			);

			where = {
				...where,
				workflow: {
					parentFolder: In([folderId, ...subFolderIds]),
				},
			};
		}

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const [projectRoles, workflowRoles] = await Promise.all([
				this.roleService.rolesWithScope('project', scopes),
				this.roleService.rolesWithScope('workflow', scopes),
			]);

			where = {
				...where,
				role: In(workflowRoles),
				project: {
					...(projectId && { id: projectId }),
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		} else if (projectId) {
			where = {
				...where,
				project: {
					id: projectId,
				},
			};
		}

		return where;
	}

	async findWorkflowIdsWithScopeForUser(
		workflowIds: string[],
		user: User,
		scopes: Scope[],
	): Promise<Set<string>> {
		if (workflowIds.length === 0) return new Set();
		const where = await this.findAllWhere(user, scopes);
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			select: { workflowId: true },
			where: { ...where, workflowId: In(workflowIds) },
		});
		return new Set(sharedWorkflows.map((sw) => sw.workflowId));
	}

	async findExistingWorkflowIds(workflowIds: string[]): Promise<Set<string>> {
		if (workflowIds.length === 0) return new Set();
		const workflows = await this.workflowRepository.find({
			select: { id: true },
			where: { id: In(workflowIds) },
		});
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

		const where = await this.findAllWhere(user, scopes);
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { ...where, workflowId: In(workflowIds) },
			relations: {
				workflow: {
					parentFolder: options.includeParentFolder,
					tags: options.includeTags,
					activeVersion: options.includeActiveVersion,
				},
			},
		});

		// A workflow may appear via several share paths (project membership +
		// direct share); dedupe so callers see one entity per id.
		const seen = new Set<string>();
		const workflows: WorkflowEntity[] = [];
		for (const { workflow } of sharedWorkflows) {
			if (seen.has(workflow.id)) continue;
			seen.add(workflow.id);
			workflows.push(workflow);
		}
		return workflows;
	}

	async findWorkflowIdsByFolder(folderIds: string[]): Promise<Map<string, string[]>> {
		if (folderIds.length === 0) return new Map();

		const rows = await this.sharedWorkflowRepository.find({
			where: { workflow: { parentFolder: In(folderIds) } },
			relations: { workflow: { parentFolder: true } },
			select: { workflowId: true, workflow: { id: true, parentFolder: { id: true } } },
		});

		const byFolder = new Map<string, string[]>();
		const seen = new Set<string>();
		for (const { workflow } of rows) {
			const folderId = workflow.parentFolder?.id;
			// A workflow may appear via several share rows; dedupe so it lands once.
			if (!folderId || seen.has(workflow.id)) continue;
			seen.add(workflow.id);
			const list = byFolder.get(folderId) ?? [];
			list.push(workflow.id);
			byFolder.set(folderId, list);
		}

		return byFolder;
	}

	/**
	 * Workflows a project owns, each paired with the folder holding it (`null` at the
	 * project root). Archived workflows are excluded unless asked for; a reconciling
	 * caller includes them so a folder holding only archived work still reads as occupied.
	 *
	 * The widest of the three scope lookups here — use {@link findRootWorkflowIdsInProject} when
	 * only the project root matters, or {@link findWorkflowIdsByFolder} for folders that need not
	 * belong to one project. This one is for reconciling a whole project, so it is the only one
	 * that carries names and filters archived rows.
	 */
	async findOwnedWorkflowPlacementsInProject(
		projectId: string,
		options: { includeArchived?: boolean } = {},
	): Promise<
		Array<{ id: string; name: string; parentFolderId: string | null; isArchived: boolean }>
	> {
		const rows = await this.sharedWorkflowRepository.find({
			where: {
				project: { id: projectId },
				role: 'workflow:owner',
				...(options.includeArchived ? {} : { workflow: { isArchived: false } }),
			},
			relations: { workflow: { parentFolder: true } },
			select: {
				workflowId: true,
				workflow: { id: true, name: true, isArchived: true, parentFolder: { id: true } },
			},
		});

		return rows.map(({ workflow }) => ({
			id: workflow.id,
			name: workflow.name,
			parentFolderId: workflow.parentFolder?.id ?? null,
			isArchived: workflow.isArchived,
		}));
	}

	/**
	 * List root workflows of a project only.
	 */
	async findRootWorkflowIdsInProject(projectId: string): Promise<string[]> {
		const rows = await this.sharedWorkflowRepository.find({
			where: {
				project: { id: projectId },
				role: 'workflow:owner',
				workflow: { parentFolder: IsNull() },
			},
			relations: { workflow: { parentFolder: true } },
			select: { workflowId: true, workflow: { id: true, parentFolder: { id: true } } },
		});

		return rows.map((row) => row.workflowId);
	}

	/**
	 * Finds owned workflows in a project that may match package workflows either
	 * by `sourceWorkflowId` or, when unset, by local id (re-import of workflows
	 * authored on this instance).
	 */
	async findOwnedWorkflowsBySourceWorkflowIds(
		projectId: string,
		sourceWorkflowIds: string[],
		options: { includeActiveVersion?: boolean; includeParentFolder?: boolean } = {},
	): Promise<WorkflowEntity[]> {
		if (sourceWorkflowIds.length === 0) return [];

		const workflowRelations = {
			activeVersion: options.includeActiveVersion,
			parentFolder: options.includeParentFolder,
		};
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: [
				{
					projectId,
					role: 'workflow:owner',
					workflow: { sourceWorkflowId: In(sourceWorkflowIds), isArchived: false },
				},
				{
					projectId,
					role: 'workflow:owner',
					workflow: {
						id: In(sourceWorkflowIds),
						sourceWorkflowId: IsNull(),
						isArchived: false,
					},
				},
			],
			relations: { workflow: workflowRelations },
		});

		return sharedWorkflows.map(({ workflow }) => workflow);
	}

	async hasProjectScopeForUser(user: User, scopes: Scope[], projectId: string) {
		return await userHasScopes(user, scopes, false, { projectId });
	}

	async findProjectIdForFolder(folderId: string): Promise<string | null> {
		const folder = await this.folderRepository.findOne({
			where: { id: folderId },
			relations: { homeProject: true },
		});

		return folder?.homeProject.id ?? null;
	}

	async findAllWorkflowIdsForUser(
		user: User,
		scopes: Scope[],
		folderId?: string,
		projectId?: string,
	) {
		const where = await this.findAllWhere(user, scopes, folderId, projectId);
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			select: { workflowId: true, projectId: true },
			where,
		});

		return Array.from(new Set(sharedWorkflows.map(({ workflowId }) => workflowId)));
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
		} = options;
		const { name, active, tagNames, folderId, projectId } = filters;

		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', scopes),
			this.roleService.rolesWithScope('workflow', scopes),
		]);

		const parentFolderIds = folderId
			? [folderId, ...(await this.folderRepository.getAllFolderIdsInHierarchy(folderId, projectId))]
			: undefined;

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

		return { workflows: workflows as WorkflowEntity[], count };
	}
}
