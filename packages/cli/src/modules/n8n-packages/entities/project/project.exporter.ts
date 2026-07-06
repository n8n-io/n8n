import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ProjectSerializer } from './project.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';

import { ProjectService } from '@/services/project.service.ee';

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

		this.assertAllRequestedProjectsFound(request.projectIds, projects);

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
