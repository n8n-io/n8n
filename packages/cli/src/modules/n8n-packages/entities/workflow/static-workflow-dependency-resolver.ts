import type { Folder, Project, User, WorkflowEntity } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { FolderFinderService } from '@/services/folder-finder.service';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	PackageExportBlockedError,
	assertEveryRequestedEntityAccessible,
} from '../package-export.errors';
import type { WorkflowWorkflowRequirement } from './workflow.types';

export type WorkflowDependencyOrigin = 'top-level' | 'folder' | 'project';

export interface ExportedWorkflowDependencySeed {
	workflowId: string;
	origin: WorkflowDependencyOrigin;
}

export interface StaticWorkflowDependency {
	workflow: WorkflowEntity;
	placement: WorkflowDependencyOrigin;
	ownerProject: Project;
	folderChain: Folder[];
}

export interface StaticWorkflowDependencyResolution {
	autoAddedWorkflows: StaticWorkflowDependency[];
}

@Service()
export class StaticWorkflowDependencyResolver {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly folderFinder: FolderFinderService,
		private readonly projectService: ProjectService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async resolve(options: {
		user: User;
		seeds: ExportedWorkflowDependencySeed[];
		requirements: WorkflowWorkflowRequirement[];
	}): Promise<StaticWorkflowDependencyResolution> {
		const exportedWorkflowIds = new Set(options.seeds.map(({ workflowId }) => workflowId));
		const originsByWorkflowId = this.resolveOrigins(options.seeds, options.requirements);

		const autoAddedWorkflowIds = [...originsByWorkflowId.keys()].filter(
			(workflowId) => !exportedWorkflowIds.has(workflowId),
		);

		const autoAddedWorkflows = await this.buildAutoAddedWorkflows({
			user: options.user,
			workflowIds: autoAddedWorkflowIds,
			originsByWorkflowId,
		});

		return { autoAddedWorkflows };
	}

	private buildInitialOrigins(
		seeds: ExportedWorkflowDependencySeed[],
	): Map<string, Set<WorkflowDependencyOrigin>> {
		const originsByWorkflowId = new Map<string, Set<WorkflowDependencyOrigin>>();
		for (const { workflowId, origin } of seeds) {
			const origins = originsByWorkflowId.get(workflowId) ?? new Set<WorkflowDependencyOrigin>();
			origins.add(origin);
			originsByWorkflowId.set(workflowId, origins);
		}
		return originsByWorkflowId;
	}

	private resolveOrigins(
		seeds: ExportedWorkflowDependencySeed[],
		requirements: WorkflowWorkflowRequirement[],
	): Map<string, Set<WorkflowDependencyOrigin>> {
		const originsByWorkflowId = this.buildInitialOrigins(seeds);
		const requirementsByWorkflowId = new Map<string, WorkflowWorkflowRequirement[]>();

		for (const requirement of requirements) {
			const current = requirementsByWorkflowId.get(requirement.workflowId) ?? [];
			current.push(requirement);
			requirementsByWorkflowId.set(requirement.workflowId, current);
		}

		const pendingWorkflowIds = [...originsByWorkflowId.keys()];
		const processedOriginKeysByWorkflowId = new Map<string, string>();

		while (pendingWorkflowIds.length > 0) {
			const workflowId = pendingWorkflowIds.shift()!;
			const origins = originsByWorkflowId.get(workflowId);
			if (!origins) continue;

			const originKey = this.originKey(origins);
			if (processedOriginKeysByWorkflowId.get(workflowId) === originKey) continue;
			processedOriginKeysByWorkflowId.set(workflowId, originKey);

			for (const requirement of requirementsByWorkflowId.get(workflowId) ?? []) {
				const nextOrigins =
					originsByWorkflowId.get(requirement.referencedWorkflowId) ??
					new Set<WorkflowDependencyOrigin>();
				const previousOriginKey = this.originKey(nextOrigins);
				for (const origin of origins) {
					nextOrigins.add(origin);
				}
				originsByWorkflowId.set(requirement.referencedWorkflowId, nextOrigins);

				if (this.originKey(nextOrigins) !== previousOriginKey) {
					pendingWorkflowIds.push(requirement.referencedWorkflowId);
				}
			}
		}

		return originsByWorkflowId;
	}

	private async buildAutoAddedWorkflows(options: {
		user: User;
		workflowIds: string[];
		originsByWorkflowId: Map<string, Set<WorkflowDependencyOrigin>>;
	}): Promise<StaticWorkflowDependency[]> {
		if (options.workflowIds.length === 0) return [];

		const workflows = await this.findExportableWorkflows(options.user, options.workflowIds);
		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		const ownersByWorkflowId = await this.findOwnerProjects(options.workflowIds);
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

	private choosePlacement(
		origins: Set<WorkflowDependencyOrigin> | undefined,
	): WorkflowDependencyOrigin {
		if (origins?.has('project')) return 'project';
		if (origins?.has('folder')) return 'folder';
		return 'top-level';
	}

	private originKey(origins: Set<WorkflowDependencyOrigin>): string {
		return [...origins].sort().join('|');
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

	private async findOwnerProjects(workflowIds: string[]): Promise<Map<string, Project>> {
		const ownerRows = await this.sharedWorkflowRepository.find({
			where: { workflowId: In(workflowIds), role: 'workflow:owner' },
			relations: { project: true },
		});

		return new Map(ownerRows.map(({ workflowId, project }) => [workflowId, project]));
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
