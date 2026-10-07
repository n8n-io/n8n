import type { ProjectScopeService } from '@n8n/backend-services';
import type { ProjectRepository, User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { DataTableAccessService } from '../data-table-access.service';
import type { DataTableRepository } from '../data-table.repository';
import { DataTableAccessDeniedError } from '../errors/data-table-access-denied.error';
import { DataTableNotFoundError } from '../errors/data-table-not-found.error';
import { DataTableProjectNotFoundError } from '../errors/data-table-project-not-found.error';

describe('DataTableAccessService', () => {
	const user = mock<User>({ id: 'user-1' });
	const projectId = 'project-1';
	const dataTableId = 'data-table-1';

	let dataTableRepository = mock<DataTableRepository>();
	let projectRepository = mock<ProjectRepository>();
	let projectScopeService = mock<ProjectScopeService>();
	let service: DataTableAccessService;

	beforeEach(() => {
		dataTableRepository = mock<DataTableRepository>();
		projectRepository = mock<ProjectRepository>();
		projectScopeService = mock<ProjectScopeService>();
		service = new DataTableAccessService(
			dataTableRepository,
			projectRepository,
			projectScopeService,
		);
	});

	describe('hasProjectAccess', () => {
		it('returns true for a project that grants the required scopes', async () => {
			projectScopeService.getProjectIds.mockResolvedValue([projectId]);

			await expect(service.hasProjectAccess(user, projectId, ['dataTable:read'])).resolves.toBe(
				true,
			);
		});

		it('returns false when the scopes belong to another project', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(['other-project']);

			await expect(service.hasProjectAccess(user, projectId, ['dataTable:read'])).resolves.toBe(
				false,
			);
		});

		it('returns true for global access', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await expect(service.hasProjectAccess(user, projectId, ['dataTable:read'])).resolves.toBe(
				true,
			);
		});
	});

	describe('resolveOwningProjectId', () => {
		it('returns the personal project when no project ID is given', async () => {
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: projectId,
			} as never);

			await expect(service.resolveOwningProjectId(user)).resolves.toBe(projectId);
		});

		it('returns an accessible project', async () => {
			projectRepository.findOne.mockResolvedValue({ id: projectId } as never);
			projectScopeService.getProjectIds.mockResolvedValue([projectId]);

			await expect(service.resolveOwningProjectId(user, projectId)).resolves.toBe(projectId);
		});

		it('returns a project for global access', async () => {
			projectRepository.findOne.mockResolvedValue({ id: projectId } as never);
			projectScopeService.getProjectIds.mockResolvedValue(null);

			await expect(service.resolveOwningProjectId(user, projectId)).resolves.toBe(projectId);
		});

		it('throws when the project does not exist', async () => {
			projectRepository.findOne.mockResolvedValue(null);

			await expect(service.resolveOwningProjectId(user, projectId)).rejects.toThrow(
				DataTableProjectNotFoundError,
			);
		});

		it('throws when the project does not grant create access', async () => {
			projectRepository.findOne.mockResolvedValue({ id: projectId } as never);
			projectScopeService.getProjectIds.mockResolvedValue([]);

			await expect(service.resolveOwningProjectId(user, projectId)).rejects.toThrow(
				DataTableAccessDeniedError,
			);
		});
	});

	describe('assertRowReadAccessIfReturningRows', () => {
		it('does not check access when no row data is returned', async () => {
			await expect(
				service.assertRowReadAccessIfReturningRows(user, dataTableId, {}),
			).resolves.toBeUndefined();
			expect(projectScopeService.getProjectIds).not.toHaveBeenCalled();
		});

		it('allows a scoped project to read returned rows', async () => {
			projectScopeService.getProjectIds.mockResolvedValue([projectId]);
			dataTableRepository.findByIdWithProjectAccess.mockResolvedValue({ projectId } as never);

			await expect(
				service.assertRowReadAccessIfReturningRows(user, dataTableId, { returnData: true }),
			).resolves.toBeUndefined();
			expect(dataTableRepository.findByIdWithProjectAccess).toHaveBeenCalledWith(dataTableId, [
				projectId,
			]);
		});

		it('allows global access to returned rows', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(null);
			dataTableRepository.findByIdWithProjectAccess.mockResolvedValue({ projectId } as never);

			await expect(
				service.assertRowReadAccessIfReturningRows(user, dataTableId, { dryRun: true }),
			).resolves.toBeUndefined();
			expect(dataTableRepository.findByIdWithProjectAccess).toHaveBeenCalledWith(dataTableId, null);
		});

		it('throws when the table exists outside the accessible projects', async () => {
			projectScopeService.getProjectIds.mockResolvedValue(['other-project']);
			dataTableRepository.findByIdWithProjectAccess.mockResolvedValue(null);
			dataTableRepository.existsBy.mockResolvedValue(true);

			await expect(
				service.assertRowReadAccessIfReturningRows(user, dataTableId, { returnData: true }),
			).rejects.toThrow(ForbiddenError);
		});

		it('throws when the table does not exist', async () => {
			projectScopeService.getProjectIds.mockResolvedValue([projectId]);
			dataTableRepository.findByIdWithProjectAccess.mockResolvedValue(null);
			dataTableRepository.existsBy.mockResolvedValue(false);

			await expect(
				service.assertRowReadAccessIfReturningRows(user, dataTableId, { returnData: true }),
			).rejects.toThrow(DataTableNotFoundError);
		});
	});
});
