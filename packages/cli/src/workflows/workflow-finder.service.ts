import type { SharedWorkflow, User, WorkflowEntity } from '@n8n/db';
import { SharedWorkflowRepository, FolderRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, IsNull } from '@n8n/typeorm';

import { userHasScopes } from '@/permissions.ee/check-access';
import { RoleService } from '@/services/role.service';

@Service()
export class WorkflowFinderService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly folderRepository: FolderRepository,
		private readonly roleService: RoleService,
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

	async findWorkflowsByIdsForUser(
		workflowIds: string[],
		user: User,
		scopes: Scope[],
		options: { includeParentFolder?: boolean } = {},
	): Promise<WorkflowEntity[]> {
		if (workflowIds.length === 0) return [];

		const where = await this.findAllWhere(user, scopes);
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { ...where, workflowId: In(workflowIds) },
			relations: { workflow: { parentFolder: options.includeParentFolder } },
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

	async findAllWorkflowsForUser(
		user: User,
		scopes: Scope[],
		folderId?: string,
		projectId?: string,
	) {
		const where = await this.findAllWhere(user, scopes, folderId, projectId);

		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where,
			relations: {
				workflow: {
					shared: { project: true },
				},
			},
		});

		return sharedWorkflows.map((sw) => ({ ...sw.workflow, projectId: sw.projectId }));
	}
}
