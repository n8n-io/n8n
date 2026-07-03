import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { FolderFinderService } from '@/services/folder-finder.service';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ProjectSerializer } from './project.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { FolderExporter } from '../folder/folder.exporter';
import { mergeRequirements } from '../requirements.types';
import type { WorkflowExportRequirements } from '../requirements.types';
import { WorkflowExporter } from '../workflow/workflow.exporter';

export interface ProjectExportRequest {
	user: User;
	projectIds: string[];
	writer: PackageWriter;
}

export interface ProjectExportResult {
	/** Project shells → `manifest.projects[]`. */
	entries: ManifestEntry[];
	/** Folders nested inside the exported projects → `manifest.folders[]`. */
	folderEntries: ManifestEntry[];
	/** Workflows nested inside the exported projects → `manifest.workflows[]`. */
	workflowEntries: ManifestEntry[];
	/** What the nested workflows need (credentials today), for the central credential pass. */
	requirements: WorkflowExportRequirements;
	/** Exported project id → target prefix (e.g. `projects/team-ligo`), for credential routing. */
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

		this.assertAllRequestedProjectsFound(request.projectIds, projects);

		const entries: ManifestEntry[] = [];
		const folderEntries: ManifestEntry[] = [];
		const workflowEntries: ManifestEntry[] = [];
		const requirementParts: WorkflowExportRequirements[] = [];
		const projectTargetsById = new Map<string, string>();
		const targets = new UniqueFilenameAllocator('projects', 'project');

		for (const project of projects) {
			const target = targets.allocate(project.name);
			const serialized = this.projectSerializer.serialize(project);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/project.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({ id: project.id, name: project.name, target });
			projectTargetsById.set(project.id, target);

			// Folder tree + the workflows contained in those folders, nested under the project.
			const folderIds = await this.folderFinder.findFolderIdsInProject(project.id);
			if (folderIds.length > 0) {
				const folderResult = await this.folderExporter.export({
					user: request.user,
					folderIds,
					writer: request.writer,
					basePrefix: target,
				});
				folderEntries.push(...folderResult.entries);
				workflowEntries.push(...folderResult.workflowEntries);
				requirementParts.push(folderResult.requirements);
			}

			// Workflows at the project root (no parent folder), nested under the project.
			const rootWorkflowIds = await this.workflowFinder.findRootWorkflowIdsInProject(project.id);
			if (rootWorkflowIds.length > 0) {
				const workflowResult = await this.workflowExporter.export({
					user: request.user,
					workflowIds: rootWorkflowIds,
					writer: request.writer,
					basePrefix: target,
				});
				workflowEntries.push(...workflowResult.entries);
				requirementParts.push(workflowResult.requirements);
			}
		}

		return {
			entries,
			folderEntries,
			workflowEntries,
			requirements: mergeRequirements(...requirementParts),
			projectTargetsById,
		};
	}

	private assertAllRequestedProjectsFound(
		requestedProjectIds: string[],
		foundProjects: Array<{ id: string }>,
	) {
		const foundProjectIds = new Set(foundProjects.map(({ id }) => id));
		const missingProjectIds = requestedProjectIds.filter((id) => !foundProjectIds.has(id));

		if (missingProjectIds.length > 0) {
			const displayedProjectIds = missingProjectIds.slice(0, 20);
			const omittedCount = missingProjectIds.length - displayedProjectIds.length;

			throw new UserError(
				`${missingProjectIds.length} project(s) not found or not accessible. Export aborted.`,
				{
					description: `Missing project IDs: ${displayedProjectIds.join(', ')}${
						omittedCount > 0 ? `, and ${omittedCount} more` : ''
					}`,
				},
			);
		}
	}
}
