import { Service } from '@n8n/di';
import type { User } from '@n8n/db';

import { ProjectService } from '@/services/project.service.ee';

import { DataTableImporter } from '../data-table/data-table.importer';
import { FolderImporter } from '../folder/folder.importer';
import type { ImportResult, ProjectImportContext } from '../import-export.types';
import type { PackageReader } from '../package-reader';
import { VariableImporter } from '../variable/variable.importer';
import { WorkflowImporter } from '../workflow/workflow.importer';
import type { ManifestProjectEntry, SerializedProject } from './project.types';

@Service()
export class ProjectImporter {
	constructor(
		private readonly projectService: ProjectService,
		private readonly folderImporter: FolderImporter,
		private readonly workflowImporter: WorkflowImporter,
		private readonly variableImporter: VariableImporter,
		private readonly dataTableImporter: DataTableImporter,
	) {}

	async import(
		projectEntries: ManifestProjectEntry[],
		reader: PackageReader,
		user: User,
	): Promise<ImportResult> {
		const results: ImportResult['projects'] = [];

		for (const entry of projectEntries) {
			const content = reader.readFile(`${entry.target}/project.json`);
			const serialized = JSON.parse(content) as SerializedProject;

			// Create the project
			const project = await this.projectService.createTeamProject(user, {
				name: serialized.name,
				icon: serialized.icon,
			});

			// Set description if present (CreateProjectDto doesn't support description)
			if (serialized.description) {
				await this.projectService.updateProject(project.id, {
					description: serialized.description,
				});
			}

			const ctx: ProjectImportContext = {
				user,
				projectId: project.id,
				projectEntry: entry,
				folderIdMap: new Map(),
				reader,
			};

			// Import entities in order: folders first (populates folderIdMap),
			// then workflows (needs remapped folder IDs), then the rest
			await this.folderImporter.importForProject(ctx, entry.folders);
			await this.workflowImporter.importForProject(ctx, entry.workflows);
			await this.variableImporter.importForProject(ctx, entry.variables);
			await this.dataTableImporter.importForProject(ctx, entry.dataTables);

			results.push({
				sourceId: entry.id,
				id: project.id,
				name: project.name,
			});
		}

		return { projects: results };
	}
}
