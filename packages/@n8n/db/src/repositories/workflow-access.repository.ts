import { Service } from '@n8n/di';
import { DataSource, In, IsNull } from '@n8n/typeorm';
import type { FindOptionsWhere } from '@n8n/typeorm';

import { Folder, Role, SharedWorkflow, type WorkflowEntity } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { chunkIds } from '../utils/chunk-ids';
import { BaseRepository } from './base-repository';
import { SharedWorkflowRepository } from './shared-workflow.repository';
import type { PublishHistoryScope } from './workflow-publish-history.repository';

class WorkflowAccessTable extends BaseRepository<SharedWorkflow> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(SharedWorkflow, dataSource.manager, transactionRunner);
	}
}

/** The roles that give a user access to a workflow. `null` means no role filter. */
export type WorkflowAccessRoles = {
	userId: string;
	projectRoles: string[];
	workflowRoles: string[];
} | null;

export type WorkflowHead = {
	versionId: string;
	activeVersionId: string | null;
	updatedAt: Date;
};

export type WorkflowFolderPlacement = {
	id: string;
	name: string;
	parentFolderId: string | null;
	isArchived: boolean;
};

function accessWhere(
	access: WorkflowAccessRoles,
	projectId?: string,
): FindOptionsWhere<SharedWorkflow> {
	if (!access) return projectId ? { project: { id: projectId } } : {};

	return {
		role: In(access.workflowRoles),
		project: {
			...(projectId && { id: projectId }),
			projectRelations: { role: In(access.projectRoles), userId: access.userId },
		},
	};
}

/** Reads for the workflow access checks of a user. */
@Service()
export class WorkflowAccessRepository {
	private readonly table: WorkflowAccessTable;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {
		this.table = new WorkflowAccessTable(dataSource, transactionRunner);
	}

	async findRolesForAccessCheck(ctx: OperationContext = {}): Promise<Role[]> {
		return await this.table.managerFor(ctx).find(Role, { relations: ['scopes'] });
	}

	async findWorkflowForUser(
		workflowId: string,
		access: WorkflowAccessRoles,
		options: {
			includeTags?: boolean;
			includeParentFolder?: boolean;
			includeActiveVersion?: boolean;
			publishHistory?: PublishHistoryScope;
		} = {},
		ctx: OperationContext = {},
	): Promise<WorkflowEntity | null> {
		const sharedWorkflow = await this.sharedWorkflowRepository.findWorkflowWithOptions(workflowId, {
			...options,
			where: accessWhere(access),
			ctx,
		});
		return sharedWorkflow?.workflow ?? null;
	}

	/** Reads only the version columns, not the workflow body. */
	async findWorkflowHeadForUser(
		workflowId: string,
		access: WorkflowAccessRoles,
		ctx: OperationContext = {},
	): Promise<WorkflowHead | null> {
		const row = await this.table.managerFor(ctx).findOne(SharedWorkflow, {
			where: { workflowId, ...accessWhere(access) },
			relations: { workflow: true },
			select: {
				workflowId: true,
				projectId: true,
				workflow: { id: true, versionId: true, activeVersionId: true, updatedAt: true },
			},
		});
		if (!row?.workflow) return null;
		return {
			versionId: row.workflow.versionId,
			activeVersionId: row.workflow.activeVersionId,
			updatedAt: row.workflow.updatedAt,
		};
	}

	async findAccessibleWorkflowIds(
		workflowIds: string[],
		access: WorkflowAccessRoles,
		projectId?: string,
		ctx: OperationContext = {},
	): Promise<Set<string>> {
		const ids = new Set<string>();
		const manager = this.table.managerFor(ctx);
		const where = accessWhere(access, projectId);
		for (const chunk of chunkIds(workflowIds)) {
			const rows = await manager.find(SharedWorkflow, {
				select: { workflowId: true },
				where: { ...where, workflowId: In(chunk) },
			});
			for (const row of rows) ids.add(row.workflowId);
		}
		return ids;
	}

	/** Returns one entity for each workflow, also when several sharings give access. */
	async findWorkflowsByIdsForUser(
		workflowIds: string[],
		access: WorkflowAccessRoles,
		relations: { parentFolder?: boolean; tags?: boolean; activeVersion?: boolean } = {},
		ctx: OperationContext = {},
	): Promise<WorkflowEntity[]> {
		const workflows = new Map<string, WorkflowEntity>();
		const manager = this.table.managerFor(ctx);
		const where = accessWhere(access);
		for (const chunk of chunkIds(workflowIds)) {
			const rows = await manager.find(SharedWorkflow, {
				where: { ...where, workflowId: In(chunk) },
				relations: { workflow: relations },
			});
			for (const { workflow } of rows) {
				if (!workflows.has(workflow.id)) workflows.set(workflow.id, workflow);
			}
		}
		return [...workflows.values()];
	}

	/** Returns one row for each sharing, so a workflow can occur more than once. */
	async findWorkflowParentFolderIds(
		folderIds: string[],
		includeArchived: boolean,
		ctx: OperationContext = {},
	): Promise<Array<{ workflowId: string; parentFolderId: string | null }>> {
		const placements: Array<{ workflowId: string; parentFolderId: string | null }> = [];
		const manager = this.table.managerFor(ctx);
		for (const chunk of chunkIds(folderIds)) {
			const rows = await manager.find(SharedWorkflow, {
				where: {
					workflow: {
						parentFolder: In(chunk),
						...(includeArchived ? {} : { isArchived: false }),
					},
				},
				relations: { workflow: { parentFolder: true } },
				select: { workflowId: true, workflow: { id: true, parentFolder: { id: true } } },
			});
			for (const { workflow } of rows) {
				placements.push({
					workflowId: workflow.id,
					parentFolderId: workflow.parentFolder?.id ?? null,
				});
			}
		}
		return placements;
	}

	async findOwnedWorkflowRemovalCandidates(
		projectId: string,
		workflowIds: string[],
		options: { includeArchived?: boolean } = {},
	): Promise<Array<{ id: string; name: string; parentFolderId: string | null }>> {
		return await this.sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates(
			projectId,
			workflowIds,
			options,
		);
	}

	async findOwnedWorkflowPlacementsInProject(
		projectId: string,
		includeArchived: boolean,
		ctx: OperationContext = {},
	): Promise<WorkflowFolderPlacement[]> {
		const rows = await this.table.managerFor(ctx).find(SharedWorkflow, {
			where: {
				project: { id: projectId },
				role: 'workflow:owner',
				...(includeArchived ? {} : { workflow: { isArchived: false } }),
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

	async findRootWorkflowIdsInProject(
		projectId: string,
		includeArchived: boolean,
		ctx: OperationContext = {},
	): Promise<string[]> {
		const rows = await this.table.managerFor(ctx).find(SharedWorkflow, {
			where: {
				project: { id: projectId },
				role: 'workflow:owner',
				workflow: {
					parentFolder: IsNull(),
					...(includeArchived ? {} : { isArchived: false }),
				},
			},
			relations: { workflow: { parentFolder: true } },
			select: { workflowId: true, workflow: { id: true, parentFolder: { id: true } } },
		});

		return rows.map((row) => row.workflowId);
	}

	/**
	 * Matches `sourceWorkflowId`, or the local id when `sourceWorkflowId` is not set.
	 */
	async findOwnedWorkflowsBySourceWorkflowIds(
		projectId: string,
		sourceWorkflowIds: string[],
		options: {
			includeActiveVersion?: boolean;
			includeParentFolder?: boolean;
			includeArchived?: boolean;
		} = {},
		ctx: OperationContext = {},
	): Promise<WorkflowEntity[]> {
		const relations = {
			activeVersion: options.includeActiveVersion,
			parentFolder: options.includeParentFolder,
		};
		const archivedFilter = options.includeArchived ? {} : { isArchived: false };
		const workflows = new Map<string, WorkflowEntity>();
		const manager = this.table.managerFor(ctx);

		// Each branch binds every id, so a chunk uses two parameters for each id.
		for (const chunk of chunkIds(sourceWorkflowIds)) {
			const rows = await manager.find(SharedWorkflow, {
				where: [
					{
						projectId,
						role: 'workflow:owner',
						workflow: { sourceWorkflowId: In(chunk), ...archivedFilter },
					},
					{
						projectId,
						role: 'workflow:owner',
						workflow: { id: In(chunk), sourceWorkflowId: IsNull(), ...archivedFilter },
					},
				],
				relations: { workflow: relations },
			});

			for (const { workflow } of rows) workflows.set(workflow.id, workflow);
		}

		return [...workflows.values()];
	}

	async findWorkflowIdsForUser(
		access: WorkflowAccessRoles,
		filter: { projectId?: string; parentFolderIds?: string[] } = {},
		ctx: OperationContext = {},
	): Promise<string[]> {
		const rows = await this.table.managerFor(ctx).find(SharedWorkflow, {
			select: { workflowId: true, projectId: true },
			where: {
				...accessWhere(access, filter.projectId),
				...(filter.parentFolderIds && {
					workflow: { parentFolder: In(filter.parentFolderIds) },
				}),
			},
		});
		return [...new Set(rows.map(({ workflowId }) => workflowId))];
	}

	async findFolderProjectId(folderId: string, ctx: OperationContext = {}): Promise<string | null> {
		const folder = await this.table.managerFor(ctx).findOne(Folder, {
			where: { id: folderId },
			relations: { homeProject: true },
		});
		return folder?.homeProject.id ?? null;
	}
}
