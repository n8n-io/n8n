import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { DataTableImportRequest } from '@/modules/n8n-packages/entities/data-table/data-table.types';
import type { ImportContext } from '@/modules/n8n-packages/n8n-packages.types';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { DataTable } from '../../data-table.entity';
import type { DataTableService } from '../../data-table.service';
import { DataTableImporter } from '../data-table-importer';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

const userHasScopesMock = vi.mocked(userHasScopes);

const context: ImportContext = {
	user: mock<User>({ id: 'user-1' }),
	projectId: 'project-1',
	folderId: null,
};

function makeImporter() {
	const dataTableService = mock<DataTableService>();
	dataTableService.findDataTablesByIds.mockResolvedValue([]);
	dataTableService.findDataTablesByNamesInProject.mockResolvedValue([]);
	return { importer: new DataTableImporter(dataTableService) };
}

function makeRequest(overrides: Partial<DataTableImportRequest> = {}): DataTableImportRequest {
	return {
		requirements: [{ id: 'dt1', name: 'Customers', usedByWorkflows: ['wf-1'] }],
		packageDataTables: [
			{ id: 'dt1', name: 'Customers', columns: [{ name: 'email', type: 'string', index: 0 }] },
		],
		matchingMode: 'by-id',
		missingMode: 'create',
		schemaConflictPolicy: 'keep-existing',
		...overrides,
	};
}

beforeEach(() => {
	userHasScopesMock.mockReset();
	userHasScopesMock.mockResolvedValue(true);
});

describe('DataTableImporter.plan', () => {
	it('returns an empty plan when the package requires no data tables', async () => {
		const { importer } = makeImporter();

		const plan = await importer.plan(context, makeRequest({ requirements: undefined }));

		expect(plan).toEqual({ creations: [], failures: [], matchedCount: 0 });
	});

	it('fails with permission-denied when the user cannot create tables in the target project', async () => {
		const { importer } = makeImporter();
		userHasScopesMock.mockResolvedValue(false);

		const plan = await importer.plan(context, makeRequest());

		expect(plan.failures).toEqual([{ kind: 'permission-denied', usedByWorkflows: ['wf-1'] }]);
		expect(userHasScopesMock).toHaveBeenCalledWith(context.user, ['dataTable:create'], false, {
			projectId: context.projectId,
		});
	});

	it('does not check creation permission when nothing needs creating', async () => {
		const { importer } = makeImporter();

		const plan = await importer.plan(context, makeRequest({ missingMode: 'do-nothing' }));

		expect(plan).toEqual({ creations: [], failures: [], matchedCount: 0 });
		expect(userHasScopesMock).not.toHaveBeenCalled();
	});

	it('throws when a required table has no bundled schema file', async () => {
		const { importer } = makeImporter();

		await expect(importer.plan(context, makeRequest({ packageDataTables: [] }))).rejects.toThrow(
			'missing the data table schema',
		);
	});

	it('matches by id only within the target project', async () => {
		const foreignTable = mock<DataTable>({
			id: 'dt1',
			projectId: 'other-project',
			columns: [],
		});
		const dataTableService = mock<DataTableService>();
		dataTableService.findDataTablesByIds.mockResolvedValue([foreignTable]);
		dataTableService.findDataTablesByNamesInProject.mockResolvedValue([]);
		const importer = new DataTableImporter(dataTableService);

		const plan = await importer.plan(context, makeRequest());

		expect(plan.creations).toEqual([]);
		expect(plan.failures).toEqual([
			expect.objectContaining({ kind: 'id-conflict', existingProjectId: 'other-project' }),
		]);
	});
});
