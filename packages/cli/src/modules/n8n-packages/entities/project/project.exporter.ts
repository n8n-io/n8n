import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';

import { FolderFinderService } from '@/services/folder-finder.service';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ProjectSerializer } from './project.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { WorkflowVersionPolicy } from '../../n8n-packages.types';
import { FolderExporter } from '../folder/folder.exporter';
import type { FolderExportResult } from '../folder/folder.exporter';
import {
	assertEveryRequestedEntityAccessible,
	PackageEntityNotFoundError,
} from '../package-export.errors';
import { mergeRequirements } from '../requirements.types';
import type { WorkflowExportRequirements } from '../requirements.types';
import { WorkflowExporter } from '../workflow/workflow.exporter';
import type { WorkflowExportResult } from '../workflow/workflow.exporter';

export interface ProjectExportRequest {
	user: User;
	projectIds: string[];
	writer: PackageWriter;
	includeTags: boolean;
	workflowVersionPolicy: WorkflowVersionPolicy;
	/**
	 * Export only these workflows from the projects, with the folders on the
	 * path to them. Omit to export whole projects. An empty array writes the
	 * project shells only. Every id must belong to one of `projectIds`.
	 */
	workflowIds?: string[];
}

interface ProjectExportResult {
	entries: ManifestEntry[];
	folderEntries: ManifestEntry[];
	workflowEntries: ManifestEntry[];
	requirements: WorkflowExportRequirements;
	projectTargetsById: Map<string, string>;
}

@Service()
export class ProjectExporter {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectSerializer: ProjectSerializer,
		private readonly folderFinder: FolderFinderService,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly folderExporter: FolderExporter,
		private readonly workflowExporter: WorkflowExporter,
	) {}

	async export(request: ProjectExportRequest): Promise<ProjectExportResult> {
		const projects = await this.projectService.findProjectsByIdsForUser(
			request.user,
			request.projectIds,
			['project:export'],
		);

		await assertEveryRequestedEntityAccessible(
			'project',
			request.projectIds,
			projects,
			async (ids) => await this.projectService.findExistingProjectIds(ids),
		);

		const selectedWorkflowIds = request.workflowIds ? new Set(request.workflowIds) : undefined;
		const allocator = new UniqueFilenameAllocator('projects', 'project');
		const results: ProjectExportResult[] = [];

		for (const project of projects) {
			const target = allocator.allocate(project.name);
			results.push(await this.exportProject(project, target, request, selectedWorkflowIds));
		}

		const merged = this.mergeProjectExportResults(results);
		if (request.workflowIds) this.assertSelectionExported(request.workflowIds, merged);
		return merged;
	}

	private assertSelectionExported(workflowIds: string[], result: ProjectExportResult): void {
		const exported = new Set(result.workflowEntries.map(({ id }) => id));
		const missing = workflowIds.filter((id) => !exported.has(id));
		if (missing.length === 0) return;

		throw new PackageEntityNotFoundError(
			`${missing.length} workflow(s) not found in the requested project(s). Export aborted.`,
			{ description: `Missing workflow IDs: ${missing.join(', ')}` },
		);
	}

	private async exportProject(
		project: Project,
		target: string,
		request: ProjectExportRequest,
		selectedWorkflowIds: ReadonlySet<string> | undefined,
	): Promise<ProjectExportResult> {
		await this.exportProjectShell(project, target, request.writer);
		const folders = await this.exportProjectFolders(
			project.id,
			target,
			request,
			selectedWorkflowIds,
		);
		const rootWorkflows = await this.exportProjectRootWorkflows(
			project.id,
			target,
			request,
			selectedWorkflowIds,
		);

		return {
			entries: [{ id: project.id, name: project.name, target }],
			folderEntries: folders.entries,
			workflowEntries: [...folders.workflowEntries, ...rootWorkflows.entries],
			requirements: mergeRequirements(folders.requirements, rootWorkflows.requirements),
			projectTargetsById: new Map([[project.id, target]]),
		};
	}

	private async exportProjectShell(
		project: Project,
		target: string,
		writer: PackageWriter,
	): Promise<void> {
		const serialized = this.projectSerializer.serialize(project);
		await writer.writeDirectory(target);
		await writer.writeFile(`${target}/project.json`, JSON.stringify(serialized, null, '\t'));
	}

	private async exportProjectFolders(
		projectId: string,
		target: string,
		request: ProjectExportRequest,
		selectedWorkflowIds: ReadonlySet<string> | undefined,
	): Promise<FolderExportResult> {
		const folderIds = await this.folderFinder.findFolderIdsInProject(projectId);
		if (folderIds.length === 0) {
			return {
				entries: [],
				workflowEntries: [],
				requirements: mergeRequirements(),
			};
		}

		return await this.folderExporter.export({
			user: request.user,
			folderIds,
			writer: request.writer,
			includeTags: request.includeTags,
			workflowVersionPolicy: request.workflowVersionPolicy,
			basePrefix: target,
			selectedWorkflowIds,
		});
	}

	private async exportProjectRootWorkflows(
		projectId: string,
		target: string,
		request: ProjectExportRequest,
		selectedWorkflowIds: ReadonlySet<string> | undefined,
	): Promise<WorkflowExportResult> {
		const rootWorkflowIds = await this.workflowFinder.findRootWorkflowIdsInProject(projectId);
		if (rootWorkflowIds.length === 0) {
			return { entries: [], requirements: mergeRequirements() };
		}

		return await this.workflowExporter.export({
			user: request.user,
			workflowIds: rootWorkflowIds,
			writer: request.writer,
			includeTags: request.includeTags,
			workflowVersionPolicy: request.workflowVersionPolicy,
			basePrefix: target,
			selectedWorkflowIds,
		});
	}

	private mergeProjectExportResults(results: ProjectExportResult[]): ProjectExportResult {
		return {
			entries: results.flatMap((result) => result.entries),
			folderEntries: results.flatMap((result) => result.folderEntries),
			workflowEntries: results.flatMap((result) => result.workflowEntries),
			requirements: mergeRequirements(...results.map((result) => result.requirements)),
			projectTargetsById: new Map(results.flatMap((result) => [...result.projectTargetsById])),
		};
	}
}
