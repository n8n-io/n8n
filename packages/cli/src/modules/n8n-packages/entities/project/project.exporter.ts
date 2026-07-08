import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { ProjectService } from '@/services/project.service.ee';

import { ProjectSerializer } from './project.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { assertEveryRequestedEntityAccessible } from '../package-export.errors';

export interface ProjectExportRequest {
	user: User;
	projectIds: string[];
	writer: PackageWriter;
}

export interface ProjectExportResult {
	entries: ManifestEntry[];
}

@Service()
export class ProjectExporter {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectSerializer: ProjectSerializer,
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

		const entries: ManifestEntry[] = [];
		const targets = new UniqueFilenameAllocator('projects', 'project');

		for (const project of projects) {
			const target = targets.allocate(project.name);
			const serialized = this.projectSerializer.serialize(project);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/project.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: project.id,
				name: project.name,
				target,
			});
		}

		return { entries };
	}
}
