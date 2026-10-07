import { ProjectScopeService } from '@n8n/backend-services';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';

import { DataTableRepository } from './data-table.repository';
import { DataTableAccessDeniedError } from './errors/data-table-access-denied.error';
import { DataTableNotFoundError } from './errors/data-table-not-found.error';
import { DataTableProjectNotFoundError } from './errors/data-table-project-not-found.error';

const MISSING_SCOPE_ERROR = 'User is missing a scope required to perform this action';

@Service()
export class DataTableAccessService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	async hasProjectAccess(user: User, projectId: string, scopes: Scope[]): Promise<boolean> {
		const accessibleProjectIds = await this.projectScopeService.getProjectIds(user, scopes);
		return accessibleProjectIds === null || accessibleProjectIds.includes(projectId);
	}

	async resolveOwningProjectId(user: User, projectId?: string): Promise<string> {
		if (!projectId) {
			const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
			return personalProject.id;
		}

		const existingProject = await this.projectRepository.findOne({ where: { id: projectId } });
		if (!existingProject) {
			throw new DataTableProjectNotFoundError(projectId);
		}

		if (!(await this.hasProjectAccess(user, projectId, ['dataTable:create']))) {
			throw new DataTableAccessDeniedError('create');
		}

		return existingProject.id;
	}

	/** A dry run returns rows even when the caller did not request `returnData`. */
	async assertRowReadAccessIfReturningRows(
		user: User,
		dataTableId: string,
		{ dryRun, returnData }: { dryRun?: boolean; returnData?: boolean },
	): Promise<void> {
		if (!dryRun && !returnData) return;

		const accessibleProjectIds = await this.projectScopeService.getProjectIds(user, [
			'dataTable:readRow',
		]);
		const dataTable = await this.dataTableRepository.findByIdWithProjectAccess(
			dataTableId,
			accessibleProjectIds,
		);
		if (dataTable) return;

		if (await this.dataTableRepository.existsBy({ id: dataTableId })) {
			throw new ForbiddenError(MISSING_SCOPE_ERROR);
		}

		throw new DataTableNotFoundError(dataTableId);
	}
}
