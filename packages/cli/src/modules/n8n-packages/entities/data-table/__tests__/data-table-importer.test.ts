import type { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import {
	type DataTable,
	type DataTableRowRuleService,
	type DataTableService,
} from '@n8n/backend-module-data-table';

import { userHasScopes } from '@/permissions.ee/check-access';

import { DataTableImporter } from '../data-table-importer';
import type { DataTableImportPlan, DataTableImportRequest } from '../data-table.types';
import type { ImportContext } from '../../../n8n-packages.types';

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
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(true);
	dataTableService.findDataTablesByIds.mockResolvedValue([]);
	dataTableService.findDataTablesByNamesInProject.mockResolvedValue([]);
	const rowRuleService = mock<DataTableRowRuleService>();
	return {
		importer: new DataTableImporter(dataTableService, moduleRegistry, rowRuleService),
		moduleRegistry,
		rowRuleService,
	};
}

function makeRequest(overrides: Partial<DataTableImportRequest> = {}): DataTableImportRequest {
	return {
		requirements: [{ id: 'dt1', name: 'Customers', usedBy: [{ kind: 'workflow', id: 'wf-1' }] }],
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
		const { importer, moduleRegistry } = makeImporter();

		const plan = await importer.plan(context, makeRequest({ requirements: undefined }));

		expect(plan).toEqual({
			creations: [],
			updates: [],
			columnAlignments: [],
			matched: [],
			failures: [],
			matchedCount: 0,
		});
		expect(moduleRegistry.isActive).not.toHaveBeenCalled();
	});

	it('fails with module-disabled when the data-table module is inactive', async () => {
		const { importer, moduleRegistry } = makeImporter();
		moduleRegistry.isActive.mockReturnValue(false);

		const plan = await importer.plan(context, makeRequest());

		expect(plan.creations).toEqual([]);
		expect(plan.failures).toEqual([{ kind: 'module-disabled' }]);
	});

	it('fails with permission-denied when the user cannot create tables in the target project', async () => {
		const { importer } = makeImporter();
		userHasScopesMock.mockResolvedValue(false);

		const plan = await importer.plan(context, makeRequest());

		expect(plan.failures).toEqual([
			{ kind: 'permission-denied', missingScope: 'dataTable:create' },
		]);
		expect(userHasScopesMock).toHaveBeenCalledWith(context.user, ['dataTable:create'], false, {
			projectId: context.projectId,
		});
	});

	it('does not check creation permission when nothing needs creating', async () => {
		const { importer } = makeImporter();

		const plan = await importer.plan(context, makeRequest({ missingMode: 'do-nothing' }));

		expect(plan).toEqual({
			creations: [],
			updates: [],
			columnAlignments: [],
			matched: [],
			failures: [],
			matchedCount: 0,
		});
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
		const moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		dataTableService.findDataTablesByIds.mockResolvedValue([foreignTable]);
		dataTableService.findDataTablesByNamesInProject.mockResolvedValue([]);
		const importer = new DataTableImporter(
			dataTableService,
			moduleRegistry,
			mock<DataTableRowRuleService>(),
		);

		const plan = await importer.plan(context, makeRequest());

		expect(plan.creations).toEqual([]);
		expect(plan.failures).toEqual([
			expect.objectContaining({ kind: 'id-conflict', existingProjectId: 'other-project' }),
		]);
	});
});

describe('DataTableImporter.apply', () => {
	const rowRule = {
		conditions: [{ column: 'email', match: 'email' as const }],
		projectMembersSeeAll: false,
		runsWithoutUser: 'deny' as const,
	};
	const plan = (rule?: typeof rowRule) =>
		({
			creations: [
				{
					id: 'dt1',
					name: 'Customers',
					columns: [{ name: 'email', type: 'string', index: 0 }],
					...(rule ? { rowRule: rule } : {}),
				},
			],
			updates: [],
			columnAlignments: [],
		}) as unknown as DataTableImportPlan;

	beforeEach(() => {
		userHasScopesMock.mockResolvedValue(true);
	});

	it('keeps the row rule of a created table', async () => {
		const { importer, rowRuleService } = makeImporter();

		await importer.apply(context, plan(rowRule));

		expect(rowRuleService.setRowRule).toHaveBeenCalledWith('dt1', 'project-1', rowRule);
	});

	it('sets no rule for a table without one', async () => {
		const { importer, rowRuleService } = makeImporter();

		await importer.apply(context, plan());

		expect(rowRuleService.setRowRule).not.toHaveBeenCalled();
	});
});
