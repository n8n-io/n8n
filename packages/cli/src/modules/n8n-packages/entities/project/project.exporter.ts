import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ProjectService } from '@/services/project.service.ee';

import { ProjectSerializer } from './project.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { generateProjectSlug } from '../../io/project-slug.utils';
import type { ManifestEntry } from '../../spec/manifest.schema';

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
		private readonly projectRepository: ProjectRepository,
		private readonly projectSerializer: ProjectSerializer,
	) {}

	async export(request: ProjectExportRequest): Promise<ProjectExportResult> {
		const projects = await this.getAccessibleProjects(request.user, request.projectIds);

		const entries: ManifestEntry[] = [];

		for (const project of projects) {
			if (project.type !== 'team') {
				throw new BadRequestError(
					`Project "${project.name}" is a personal project and cannot be exported`,
				);
			}

			const slug = generateProjectSlug(project.name, project.id);
			const target = `projects/${slug}`;
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

	private async getAccessibleProjects(user: User, projectIds: string[]): Promise<Project[]> {
		const accessibleProjectIds = new Set(
			await this.projectService.getProjectIdsWithScope(user, ['project:export'], projectIds),
		);

		const missingProjectIds = projectIds.filter((id) => !accessibleProjectIds.has(id));

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

		return await this.projectRepository.find({ where: { id: In(projectIds) } });
	}
}
