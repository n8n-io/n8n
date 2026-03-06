import { Service } from '@n8n/di';
import { ProjectRepository } from '@n8n/db';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExportPipeline } from '../export-pipeline';
import type { ExportScope, PackageRequirements } from '../import-export.types';
import type { PackageWriter } from '../package-writer';
import { generateSlug } from '../slug.utils';

import { ProjectSerializer } from './project.serializer';
import type { ManifestProjectEntry } from './project.types';

export interface ProjectExportResult {
	entry: ManifestProjectEntry;
	requirements: PackageRequirements;
}

/**
 * Orchestrates exporting a single project. Unlike entity-level exporters
 * (which implement `EntityExporter`), this creates the project wrapper
 * and delegates entity export to the `ExportPipeline`.
 */
@Service()
export class ProjectExporter {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectSerializer: ProjectSerializer,
		private readonly exportPipeline: ExportPipeline,
	) {}

	async export(
		projectId: string,
		writer: PackageWriter,
		options?: { includeVariableValues?: boolean },
	): Promise<ProjectExportResult> {
		const project = await this.projectRepository.findOneByOrFail({ id: projectId });

		if (project.type !== 'team') {
			throw new BadRequestError(
				`Project "${project.name}" is a personal project and cannot be exported`,
			);
		}

		const slug = generateSlug(project.name, project.id);
		const target = `projects/${slug}`;
		const serialized = this.projectSerializer.serialize(project);

		writer.writeDirectory(target);
		writer.writeFile(`${target}/project.json`, JSON.stringify(serialized, null, '\t'));

		const scope: ExportScope = {
			basePath: target,
			projectId: project.id,
			entityOptions: {
				variables: { includeValues: options?.includeVariableValues ?? true },
			},
			state: {
				folderPathMap: new Map(),
				nodesByWorkflow: [],
			},
			writer,
		};

		const pipelineResult = await this.exportPipeline.run(scope);

		const entry: ManifestProjectEntry = {
			id: project.id,
			name: project.name,
			target,
			folders: pipelineResult.folders,
			workflows: pipelineResult.workflows,
			credentials: pipelineResult.credentials,
			variables: pipelineResult.variables,
			dataTables: pipelineResult.dataTables,
		};

		return { entry, requirements: pipelineResult.requirements };
	}
}
