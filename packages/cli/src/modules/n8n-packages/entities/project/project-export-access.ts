import type { Project, User } from '@n8n/db';

import type { ProjectService } from '@/services/project.service.ee';

import { assertEveryRequestedEntityAccessible } from '../package-export.errors';

export async function findExportableProjects(
	projectService: ProjectService,
	user: User,
	projectIds: string[],
): Promise<Project[]> {
	if (projectIds.length === 0) return [];
	const projects = await projectService.findProjectsByIdsForUser(user, projectIds, [
		'project:export',
	]);
	await assertEveryRequestedEntityAccessible(
		'project',
		projectIds,
		projects,
		async (ids) => await projectService.findExistingProjectIds(ids),
	);
	return projects;
}
