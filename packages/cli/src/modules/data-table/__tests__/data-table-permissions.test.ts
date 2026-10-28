import { ModuleRegistry } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { assertRowReadAccessIfReturningRows } from '../data-table-permissions';
import { DataTableRepository } from '../data-table.repository';

describe('assertRowReadAccessIfReturningRows', () => {
	const projectScopes = mockInstance(ProjectScopeService);
	const tables = mockInstance(DataTableRepository);
	const modules = mockInstance(ModuleRegistry);
	const user = mock<User>();

	beforeEach(() => {
		vi.clearAllMocks();
		projectScopes.getProjectIds.mockResolvedValue(['project-1']);
		tables.findProjectIdForScope.mockResolvedValue('project-1');
		modules.isActive.mockReturnValue(true);
	});

	it('skips the read check when the operation returns no rows', async () => {
		await assertRowReadAccessIfReturningRows(user, 'table-1', {});

		expect(projectScopes.getProjectIds).not.toHaveBeenCalled();
		expect(tables.findProjectIdForScope).not.toHaveBeenCalled();
	});

	it.each([{ returnData: true }, { dryRun: true, returnData: false }])(
		'checks the table project when the operation returns rows: %j',
		async (options) => {
			await assertRowReadAccessIfReturningRows(user, 'table-1', options);

			expect(projectScopes.getProjectIds).toHaveBeenCalledWith(user, ['dataTable:readRow']);
			expect(tables.findProjectIdForScope).toHaveBeenCalledWith('table-1');
		},
	);

	it('allows a global scope before resolving the table', async () => {
		projectScopes.getProjectIds.mockResolvedValue(null);
		modules.isActive.mockReturnValue(false);

		await assertRowReadAccessIfReturningRows(user, 'table-1', { returnData: true });

		expect(tables.findProjectIdForScope).not.toHaveBeenCalled();
	});

	it('rejects a table in a project without row-read access', async () => {
		tables.findProjectIdForScope.mockResolvedValue('project-2');

		await expect(
			assertRowReadAccessIfReturningRows(user, 'table-1', { returnData: true }),
		).rejects.toThrow(ForbiddenError);
	});

	it('rejects a dry run when the user has no readable projects', async () => {
		projectScopes.getProjectIds.mockResolvedValue([]);

		await expect(
			assertRowReadAccessIfReturningRows(user, 'table-1', { dryRun: true, returnData: false }),
		).rejects.toThrow(ForbiddenError);
	});

	it('reports a missing table', async () => {
		tables.findProjectIdForScope.mockResolvedValue(null);

		await expect(
			assertRowReadAccessIfReturningRows(user, 'table-1', { returnData: true }),
		).rejects.toThrow(NotFoundError);
	});

	it('reports a missing table when the module is disabled', async () => {
		modules.isActive.mockReturnValue(false);

		await expect(
			assertRowReadAccessIfReturningRows(user, 'table-1', { returnData: true }),
		).rejects.toThrow('Data table with ID "table-1" not found.');
		expect(tables.findProjectIdForScope).not.toHaveBeenCalled();
	});
});
