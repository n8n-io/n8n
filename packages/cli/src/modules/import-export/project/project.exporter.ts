import { Service } from '@n8n/di';
import { ProjectRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { Exporter } from '../exporter';
import { CredentialExporter } from '../credential/credential.exporter';
import { DataTableExporter } from '../data-table/data-table.exporter';
import { FolderExporter } from '../folder/folder.exporter';
import type { ExportContext, ProjectExportContext } from '../import-export.types';
import type { PackageWriter } from '../package-writer';
import { generateSlug } from '../slug.utils';
import { VariableExporter } from '../variable/variable.exporter';
import { WorkflowExporter } from '../workflow/workflow.exporter';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ProjectSerializer } from './project.serializer';
import type { ManifestProjectEntry } from './project.types';

@Service()
export class ProjectExporter implements Exporter<ManifestProjectEntry> {
	readonly key = 'projects';

	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectSerializer: ProjectSerializer,
		private readonly folderExporter: FolderExporter,
		private readonly workflowExporter: WorkflowExporter,
		private readonly credentialExporter: CredentialExporter,
		private readonly variableExporter: VariableExporter,
		private readonly dataTableExporter: DataTableExporter,
	) {}

	async export(context: ExportContext, writer: PackageWriter): Promise<ManifestProjectEntry[]> {
		const projects = await this.projectRepository.find({
			where: { id: In(context.projectIds) },
		});

		for (const project of projects) {
			if (project.type !== 'team') {
				throw new BadRequestError(
					`Project "${project.name}" is a personal project and cannot be exported`,
				);
			}
		}

		const entries: ManifestProjectEntry[] = [];

		for (const project of projects) {
			const slug = generateSlug(project.name, project.id);
			const target = `projects/${slug}`;
			const serialized = this.projectSerializer.serialize(project);

			writer.writeDirectory(target);
			writer.writeFile(`${target}/project.json`, JSON.stringify(serialized, null, '\t'));

			const ctx: ProjectExportContext = {
				projectId: project.id,
				projectTarget: target,
				folderPathMap: new Map(),
				writer,
			};

			// Folders must run first — they populate ctx.folderPathMap
			const folders = await this.folderExporter.exportForProject(ctx);
			const workflows = await this.workflowExporter.exportForProject(ctx);
			const credentials = await this.credentialExporter.exportForProject(ctx);
			const variables = await this.variableExporter.exportForProject(ctx);
			const dataTables = await this.dataTableExporter.exportForProject(ctx);

			entries.push({
				id: project.id,
				name: project.name,
				target,
				folders,
				workflows,
				credentials,
				variables,
				dataTables,
			});
		}

		return entries;
	}
}
