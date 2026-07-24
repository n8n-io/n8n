import type { Folder, Project, User, WorkflowEntity } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { FolderFinderService } from '@/services/folder-finder.service';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	PackageExportBlockedError,
	assertEveryRequestedEntityAccessible,
} from '../package-export.errors';
import type { WorkflowSubWorkflowRequirement } from './workflow.types';

export type WorkflowExportOrigin = 'top-level' | 'folder' | 'project';

export interface AutoIncludedWorkflow {
	workflow: WorkflowEntity;
	placement: WorkflowExportOrigin;
	ownerProject: Project;
	folderChain: Folder[];
}

export interface AutoIncludedWorkflowResolution {
	autoIncludedWorkflows: AutoIncludedWorkflow[];
}

@Service()
export class AutoIncludedWorkflowResolver {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly folderFinder: FolderFinderService,
		private readonly projectService: ProjectService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async resolve(options: {
		user: User;
		requirements: WorkflowSubWorkflowRequirement[];
		topLevelWorkflowIds: string[];
		folderWorkflowIds: string[];
		projectWorkflowIds: string[];
	}): Promise<AutoIncludedWorkflowResolution> {
		const originsByWorkflowId = this.seedExportedOrigins({
			topLevelWorkflowIds: options.topLevelWorkflowIds,
			folderWorkflowIds: options.folderWorkflowIds,
			projectWorkflowIds: options.projectWorkflowIds,
		});
		const exportedWorkflowIds = new Set(originsByWorkflowId.keys());

		this.propagateOrigins(originsByWorkflowId, options.requirements);

		const autoIncludedWorkflowIds = [...originsByWorkflowId.keys()].filter(
			(workflowId) => !exportedWorkflowIds.has(workflowId),
		);

		const autoIncludedWorkflows = await this.buildAutoIncludedWorkflows({
			user: options.user,
			workflowIds: autoIncludedWorkflowIds,
			originsByWorkflowId,
		});

		return { autoIncludedWorkflows };
	}

	/**
	 * Seed origin sets from the export buckets in one pass. The same workflow can
	 * appear in more than one bucket when export options overlap; origins are merged
	 * so placement can pick the richest context later.
	 */
	private seedExportedOrigins(options: {
		topLevelWorkflowIds: string[];
		folderWorkflowIds: string[];
		projectWorkflowIds: string[];
	}): Map<string, Set<WorkflowExportOrigin>> {
		const originsByWorkflowId = new Map<string, Set<WorkflowExportOrigin>>();

		const add = (workflowIds: string[], origin: WorkflowExportOrigin) => {
			for (const workflowId of workflowIds) {
				const origins = originsByWorkflowId.get(workflowId) ?? new Set<WorkflowExportOrigin>();
				origins.add(origin);
				originsByWorkflowId.set(workflowId, origins);
			}
		};

		add(options.topLevelWorkflowIds, 'top-level');
		add(options.folderWorkflowIds, 'folder');
		add(options.projectWorkflowIds, 'project');

		return originsByWorkflowId;
	}

	/**
	 * BFS: copy each workflow's origins onto the static sub-workflows it
	 * references. A child is re-queued only when its origin set grows (e.g. a
	 * second path adds `folder` after it already had `top-level`), so richer
	 * placement context reaches transitive dependents. `Set.add` is a no-op when
	 * the id is already queued; the live map is read on dequeue.
	 */
	private propagateOrigins(
		originsByWorkflowId: Map<string, Set<WorkflowExportOrigin>>,
		requirements: WorkflowSubWorkflowRequirement[],
	): void {
		const requirementsByWorkflowId = new Map<string, WorkflowSubWorkflowRequirement[]>();

		for (const requirement of requirements) {
			const current = requirementsByWorkflowId.get(requirement.workflowId) ?? [];
			current.push(requirement);
			requirementsByWorkflowId.set(requirement.workflowId, current);
		}

		const pending = new Set(originsByWorkflowId.keys());

		while (pending.size > 0) {
			const workflowId = pending.values().next().value!;
			pending.delete(workflowId);

			const origins = originsByWorkflowId.get(workflowId);

			// in principle this should never happen.
			if (!origins) continue;

			for (const { referencedWorkflowId } of requirementsByWorkflowId.get(workflowId) ?? []) {
				const childOrigins =
					originsByWorkflowId.get(referencedWorkflowId) ?? new Set<WorkflowExportOrigin>();

				// merge parent origins into child origins, so that the child inherits the parent's origins.
				let changed = false;
				for (const origin of origins) {
					if (!childOrigins.has(origin)) {
						childOrigins.add(origin);
						changed = true;
					}
				}
				originsByWorkflowId.set(referencedWorkflowId, childOrigins);

				if (changed) {
					pending.add(referencedWorkflowId);
				}
			}
		}
	}

	private async buildAutoIncludedWorkflows(options: {
		user: User;
		workflowIds: string[];
		originsByWorkflowId: Map<string, Set<WorkflowExportOrigin>>;
	}): Promise<AutoIncludedWorkflow[]> {
		if (options.workflowIds.length === 0) return [];

		const workflows = await this.findExportableWorkflows(options.user, options.workflowIds);
		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		const ownersByWorkflowId = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
			options.workflowIds,
		);
		const placementsByWorkflowId = new Map(
			options.workflowIds.map((workflowId) => [
				workflowId,
				this.choosePlacement(options.originsByWorkflowId.get(workflowId)),
			]),
		);

		const folderIds = options.workflowIds
			.map((workflowId) => workflowsById.get(workflowId))
			.filter((workflow): workflow is WorkflowEntity => workflow !== undefined)
			.filter((workflow) => placementsByWorkflowId.get(workflow.id) !== 'top-level')
			.map((workflow) => workflow.parentFolder?.id)
			.filter((folderId): folderId is string => folderId !== undefined);

		const folderChainsByFolderId = await this.findAccessibleFolderChains(options.user, folderIds);

		const projectIds = [
			...new Set(
				options.workflowIds
					.filter((workflowId) => placementsByWorkflowId.get(workflowId) === 'project')
					.map((workflowId) => ownersByWorkflowId.get(workflowId)?.id)
					.filter((projectId): projectId is string => projectId !== undefined),
			),
		];
		const accessibleProjectsById = await this.findAccessibleProjects(options.user, projectIds);

		return options.workflowIds.map((workflowId) => {
			const workflow = workflowsById.get(workflowId);
			const ownerProject = ownersByWorkflowId.get(workflowId);
			if (!workflow || !ownerProject) {
				throw new PackageExportBlockedError(
					'Static sub-workflow dependency could not be resolved. Export aborted.',
				);
			}

			let placement = placementsByWorkflowId.get(workflowId) ?? 'top-level';
			if (placement === 'folder' && !workflow.parentFolder) {
				placement = 'top-level';
			}

			if (placement === 'project' && !accessibleProjectsById.has(ownerProject.id)) {
				throw new PackageExportBlockedError(
					'Static sub-workflow dependency project metadata is not accessible. Export aborted.',
				);
			}

			const folderChain = workflow.parentFolder
				? (folderChainsByFolderId.get(workflow.parentFolder.id) ?? [])
				: [];
			if (placement !== 'top-level' && workflow.parentFolder && folderChain.length === 0) {
				throw new PackageExportBlockedError(
					'Static sub-workflow dependency folder metadata is not accessible. Export aborted.',
				);
			}

			return { workflow, placement, ownerProject, folderChain };
		});
	}

	private choosePlacement(origins: Set<WorkflowExportOrigin> | undefined): WorkflowExportOrigin {
		if (origins?.has('project')) return 'project';
		if (origins?.has('folder')) return 'folder';
		return 'top-level';
	}

	private async findExportableWorkflows(
		user: User,
		workflowIds: string[],
	): Promise<WorkflowEntity[]> {
		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			workflowIds,
			user,
			['workflow:export'],
			{ includeParentFolder: true },
		);

		await assertEveryRequestedEntityAccessible(
			'workflow',
			workflowIds,
			workflows,
			async (ids) => await this.workflowFinder.findExistingWorkflowIds(ids),
		);

		return workflows;
	}

	private async findAccessibleFolderChains(
		user: User,
		folderIds: string[],
	): Promise<Map<string, Folder[]>> {
		const uniqueFolderIds = [...new Set(folderIds)];
		const folderChainsByFolderId = await this.folderFinder.findFolderAncestorChainsForUser(
			uniqueFolderIds,
			user,
			['folder:read'],
		);

		await assertEveryRequestedEntityAccessible(
			'folder',
			uniqueFolderIds,
			[...folderChainsByFolderId.values()]
				.map((chain) => chain.at(-1))
				.filter((folder): folder is Folder => folder !== undefined),
			async (ids) => await this.folderFinder.findExistingFolderIds(ids),
		);

		return folderChainsByFolderId;
	}

	private async findAccessibleProjects(
		user: User,
		projectIds: string[],
	): Promise<Map<string, Project>> {
		const projects = await this.projectService.findProjectsByIdsForUser(user, projectIds, [
			'project:export',
		]);

		await assertEveryRequestedEntityAccessible(
			'project',
			projectIds,
			projects,
			async (ids) => await this.projectService.findExistingProjectIds(ids),
		);

		return new Map(projects.map((project) => [project.id, project]));
	}
}
