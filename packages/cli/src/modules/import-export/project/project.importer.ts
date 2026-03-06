import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';

import { ProjectService } from '@/services/project.service.ee';

import { ImportPipeline } from '../import-pipeline';
import type { ImportPipelineOptions } from '../import-pipeline';
import type { ImportScope } from '../import-export.types';
import type { PackageReader } from '../package-reader';
import type { ManifestProjectEntry, SerializedProject } from './project.types';

export interface ResolvedBindings {
	credentialBindings: Map<string, string>;
	subWorkflowBindings: Map<string, string>;
}

export interface ProjectImportResult {
	sourceId: string;
	id: string;
	name: string;
}

/**
 * Orchestrates importing a single project. Unlike entity-level importers
 * (which implement `EntityImporter`), this finds an existing project by name
 * or creates a new one, then delegates entity import to the `ImportPipeline`.
 */
@Service()
export class ProjectImporter {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectRepository: ProjectRepository,
		private readonly importPipeline: ImportPipeline,
	) {}

	async import(
		entry: ManifestProjectEntry,
		reader: PackageReader,
		user: User,
		resolvedBindings?: ResolvedBindings,
		options?: ImportPipelineOptions,
		variableOptions?: { withValues: boolean; overwriteValues: boolean },
	): Promise<ProjectImportResult> {
		const content = reader.readFile(`${entry.target}/project.json`);
		const serialized: SerializedProject = jsonParse(content);

		// Reuse an existing team project with the same name, or create a new one
		let project = await this.projectRepository.findOne({
			where: { name: serialized.name, type: 'team' },
		});

		if (project) {
			// Update icon/description to match the package
			await this.projectService.updateProject(project.id, {
				name: serialized.name,
				icon: serialized.icon,
				description: serialized.description,
			});
		} else {
			project = await this.projectService.createTeamProject(user, {
				name: serialized.name,
				icon: serialized.icon,
			});

			if (serialized.description) {
				await this.projectService.updateProject(project.id, {
					description: serialized.description,
				});
			}
		}

		const scope: ImportScope = {
			user,
			targetProjectId: project.id,
			reader,
			entityOptions: {
				variables: variableOptions,
			},
			state: ImportPipeline.createPipelineState(
				resolvedBindings?.credentialBindings,
				resolvedBindings?.subWorkflowBindings,
			),
		};

		// Run the entity-level import with the project's entity entries
		await this.importPipeline.importEntities(
			scope,
			{
				folders: entry.folders,
				workflows: entry.workflows,
				credentials: entry.credentials,
				variables: entry.variables,
				dataTables: entry.dataTables,
			},
			options,
		);

		return { sourceId: entry.id, id: project.id, name: project.name };
	}
}
