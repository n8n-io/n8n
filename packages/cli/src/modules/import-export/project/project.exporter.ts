import { Service } from '@n8n/di';
import { ProjectRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { Exporter } from '../exporter';
import type { ExportContext } from '../import-export.types';
import type { PackageWriter } from '../package-writer';
import { generateSlug } from '../slug.utils';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ProjectSerializer } from './project.serializer';
import type { ManifestProjectEntry } from './project.types';

@Service()
export class ProjectExporter implements Exporter<ManifestProjectEntry> {
	readonly key = 'projects';

	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectSerializer: ProjectSerializer,
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

			entries.push({
				id: project.id,
				name: project.name,
				target,
			});
		}

		return entries;
	}
}
