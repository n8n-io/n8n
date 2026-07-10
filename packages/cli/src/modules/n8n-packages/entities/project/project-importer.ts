import { LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ProjectService } from '@/services/project.service.ee';

import type { PreparedProject, ProjectPlanItem } from './project-import.types';
import type { ImportedProjectSummary } from '../../n8n-packages.types';

@Service()
export class ProjectImporter {
	constructor(
		private readonly projectService: ProjectService,
		private readonly licenseState: LicenseState,
	) {}

	async plan(user: User, projects: PreparedProject[]): Promise<ProjectPlanItem[]> {
		const items: ProjectPlanItem[] = [];

		for (const project of projects) {
			const existing = await this.projectService.findProject(project.sourceProjectId);

			if (existing) {
				// Never import over a personal project
				if (existing.type !== 'team') {
					throw new ForbiddenError(
						`Cannot import project "${project.name}": its id belongs to a non-team project on this instance.`,
					);
				}
				const authorized = await this.projectService.getProjectWithScope(user, existing.id, [
					'project:update',
				]);
				if (!authorized) {
					throw new ForbiddenError(
						`You do not have permission to update the existing project "${project.name}".`,
					);
				}
				items.push({ action: 'update', ...toFields(project) });
			} else {
				this.assertCanCreateProjects(user);
				items.push({ action: 'create', ...toFields(project) });
			}
		}

		return items;
	}

	async apply(user: User, items: ProjectPlanItem[]): Promise<ImportedProjectSummary[]> {
		const summaries: ImportedProjectSummary[] = [];

		for (const item of items) {
			if (item.action === 'create') {
				const project = await this.projectService.createTeamProject(
					user,
					{ name: item.name, icon: item.icon },
					{ id: item.sourceProjectId, description: item.description ?? null },
				);
				summaries.push({
					sourceProjectId: item.sourceProjectId,
					localId: project.id,
					name: project.name,
					status: 'created',
				});
			} else {
				await this.projectService.updateProject(item.sourceProjectId, {
					name: item.name,
					icon: item.icon,
					description: item.description,
				});
				summaries.push({
					sourceProjectId: item.sourceProjectId,
					localId: item.sourceProjectId,
					name: item.name,
					status: 'updated',
				});
			}
		}

		return summaries;
	}

	private assertCanCreateProjects(user: User): void {
		if (!hasGlobalScope(user, 'project:create')) {
			throw new ForbiddenError('You do not have permission to create projects.');
		}
		if (!this.licenseState.isLicensed('feat:projectRole:admin')) {
			throw new ForbiddenError(
				'Your license does not allow creating team projects. Project import requires a license that supports team projects.',
			);
		}
	}
}

function toFields(project: PreparedProject): Omit<ProjectPlanItem, 'action'> {
	return {
		sourceProjectId: project.sourceProjectId,
		name: project.name,
		...(project.description !== undefined ? { description: project.description } : {}),
		...(project.icon !== undefined ? { icon: project.icon } : {}),
	};
}
