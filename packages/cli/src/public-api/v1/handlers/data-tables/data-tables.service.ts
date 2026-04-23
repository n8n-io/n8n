import { type DataTableListFilter } from '@n8n/api-types';
import { ProjectRepository, ProjectRelationRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ProjectService } from '@/services/project.service.ee';

/**
 * Gets the project ID for a data table.
 * Called AFTER projectScope middleware has validated access.
 */
export async function getProjectIdForDataTable(dataTableId: string): Promise<string> {
	const dataTable = await Container.get(DataTableRepository).findOne({
		where: { id: dataTableId },
		relations: ['project'],
	});

	if (!dataTable) {
		throw new DataTableNotFoundError(dataTableId);
	}

	return dataTable.project.id;
}

export async function getDataTableListFilter(
	userId: string,
	isGlobalOwnerOrAdmin: boolean,
	requestedProjectId: string | string[] | undefined,
	restFilter: Omit<DataTableListFilter, 'projectId'>,
): Promise<DataTableListFilter> {
	if (requestedProjectId) {
		return { ...restFilter, projectId: requestedProjectId };
	}

	if (isGlobalOwnerOrAdmin) {
		return restFilter;
	}

	const personalProject =
		await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(userId);

	const projectRelations = await Container.get(ProjectRelationRepository).find({
		where: { userId },
		relations: ['project'],
	});

	const teamProjectIds = projectRelations
		.filter((rel) => rel.project.type === 'team')
		.map((rel) => rel.projectId);

	return {
		...restFilter,
		projectId: [personalProject.id, ...teamProjectIds],
	};
}

export async function resolveProjectIdForCreate(
	user: User,
	requestedProjectId?: string,
): Promise<string> {
	if (!requestedProjectId) {
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
		return project.id;
	}

	const exists = await Container.get(ProjectRepository).findOneBy({ id: requestedProjectId });
	if (!exists) {
		throw new BadRequestError(`Project with ID "${requestedProjectId}" not found`);
	}

	const project = await Container.get(ProjectService).getProjectWithScope(
		user,
		requestedProjectId,
		['dataTable:create'],
	);
	if (!project) throw new ForbiddenError();

	return project.id;
}
