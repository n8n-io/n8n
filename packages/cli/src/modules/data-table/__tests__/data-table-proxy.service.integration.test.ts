import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ListDataTableQueryDto } from '@n8n/api-types';
import type {
	AddDataTableColumnOptions,
	INode,
	ListDataTableRowsOptions,
	MoveDataTableColumnOptions,
	UpsertDataTableRowOptions,
	Workflow,
} from 'n8n-workflow';

import * as checkAccess from '@/permissions.ee/check-access';
import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { OwnershipService } from '@/services/ownership.service';

import type { DataTableAggregateService } from '../data-table-aggregate.service';
import { DataTableProxyService } from '../data-table-proxy.service';
import type { DataTableService } from '../data-table.service';

const PROJECT_ID = 'project-id';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});
describe('DataTableProxyService', () => {
	let dataTableServiceMock = mock<DataTableService>();
	let dataTableAggregateServiceMock = mock<DataTableAggregateService>();
	let ownershipServiceMock = mock<OwnershipService>();
	let loggerMock = mock<Logger>();
	let sourceControlPreferencesServiceMock = mock<SourceControlPreferencesService>();
	let dataTableProxyService: DataTableProxyService;

	let workflow: Workflow;
	let node: INode;
	let project: Project;

	beforeEach(() => {
		dataTableServiceMock = mock<DataTableService>();
		dataTableAggregateServiceMock = mock<DataTableAggregateService>();
		ownershipServiceMock = mock<OwnershipService>();
		loggerMock = mock<Logger>();
		sourceControlPreferencesServiceMock = mock<SourceControlPreferencesService>();
		sourceControlPreferencesServiceMock.getPreferences.mockReturnValue({
			branchReadOnly: false,
		} as ReturnType<SourceControlPreferencesService['getPreferences']>);

		dataTableProxyService = new DataTableProxyService(
			dataTableServiceMock,
			dataTableAggregateServiceMock,
			ownershipServiceMock,
			loggerMock,
			sourceControlPreferencesServiceMock,
		);

		workflow = mock<Workflow>({
			id: 'workflow-id',
		});
		project = mock<Project>({
			id: PROJECT_ID,
		});
		node = mock<INode>({
			type: 'n8n-nodes-base.dataTable',
		});

		ownershipServiceMock.getWorkflowProjectCached.mockResolvedValueOnce(project);
	});

	describe('makeAggregateOperations', () => {
		it('should call getManyAndCount with correct parameters', async () => {
			const options = { filter: { name: 'test' } };

			const aggregateOperations = await dataTableProxyService.getDataTableAggregateProxy(
				workflow,
				node,
			);
			await aggregateOperations.getManyAndCount(options);

			expect(dataTableServiceMock.getManyAndCount).toBeCalledWith({
				filter: { name: 'test', projectId: PROJECT_ID },
			});
		});

		it('should call createDataTable with correct parameters', async () => {
			const options = { name: 'newDataTable', columns: [] };

			const aggregateOperations = await dataTableProxyService.getDataTableAggregateProxy(
				workflow,
				node,
			);
			await aggregateOperations.createDataTable(options);

			expect(dataTableServiceMock.createDataTable).toBeCalledWith(PROJECT_ID, options);
		});

		it('should call deleteDataTableByProject when proxy calls deleteDataTableAll', async () => {
			const aggregateOperations = await dataTableProxyService.getDataTableAggregateProxy(
				workflow,
				node,
			);
			await aggregateOperations.deleteDataTableAll();

			expect(dataTableServiceMock.deleteDataTableByProjectId).toBeCalledWith(PROJECT_ID);
		});
	});
	it('should call updateDataTable with correct parameters', async () => {
		const options = { name: 'updatedDataTable' };

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.updateDataTable(options);

		expect(dataTableServiceMock.updateDataTable).toBeCalledWith(
			'dataTable-id',
			PROJECT_ID,
			options,
		);
	});

	it('should call deleteDataTable with correct parameters', async () => {
		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.deleteDataTable();

		expect(dataTableServiceMock.deleteDataTable).toBeCalledWith('dataTable-id', PROJECT_ID);
	});

	it('should call getColumns with correct parameters', async () => {
		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.getColumns();

		expect(dataTableServiceMock.getColumns).toBeCalledWith('dataTable-id', PROJECT_ID);
	});

	it('should call addColumn with correct parameters', async () => {
		const options: AddDataTableColumnOptions = { name: 'newColumn', type: 'string' };

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.addColumn(options);

		expect(dataTableServiceMock.addColumn).toBeCalledWith('dataTable-id', PROJECT_ID, options);
	});

	it('should call moveColumn with correct parameters', async () => {
		const columnId = 'column-id';
		const options: MoveDataTableColumnOptions = { targetIndex: 1 };

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.moveColumn(columnId, options);

		expect(dataTableServiceMock.moveColumn).toBeCalledWith(
			'dataTable-id',
			PROJECT_ID,
			columnId,
			options,
		);
	});

	it('should call deleteColumn with correct parameters', async () => {
		const columnId = 'column-id';

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.deleteColumn(columnId);

		expect(dataTableServiceMock.deleteColumn).toBeCalledWith('dataTable-id', PROJECT_ID, columnId);
	});

	it('should call getManyRowsAndCount with correct parameters', async () => {
		const options: ListDataTableRowsOptions = {
			filter: {
				filters: [{ columnName: 'x', condition: 'eq', value: 'testRow' }],
				type: 'and',
			},
		};

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.getManyRowsAndCount(options);

		expect(dataTableServiceMock.getManyRowsAndCount).toBeCalledWith(
			'dataTable-id',
			PROJECT_ID,
			options,
		);
	});

	it('should call insertRows with correct parameters', async () => {
		const rows = [{ id: 1, name: 'row1' }];

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.insertRows(rows, 'count');

		expect(dataTableServiceMock.insertRows).toBeCalledWith(
			'dataTable-id',
			PROJECT_ID,
			rows,
			'count',
		);
	});

	it('should call upsertRow with correct parameters', async () => {
		const options: UpsertDataTableRowOptions = {
			filter: {
				filters: [{ columnName: 'name', condition: 'eq', value: 'test' }],
				type: 'and',
			},
			data: { name: 'newName' },
		};

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.upsertRow(options);

		expect(dataTableServiceMock.upsertRow).toBeCalledWith(
			'dataTable-id',
			PROJECT_ID,
			options,
			true,
			undefined,
		);
	});

	it('should call upsertRow dry run with correct parameters', async () => {
		const options: UpsertDataTableRowOptions = {
			filter: {
				filters: [{ columnName: 'name', condition: 'eq', value: 'test' }],
				type: 'and',
			},
			data: { name: 'newName' },
			dryRun: true,
		};

		const dataTableOperations = await dataTableProxyService.getDataTableProxy(
			workflow,
			node,
			'dataTable-id',
		);
		await dataTableOperations.upsertRow(options);

		expect(dataTableServiceMock.upsertRow).toBeCalledWith(
			'dataTable-id',
			PROJECT_ID,
			options,
			true,
			true,
		);
	});
});

describe('makeDataTableOperationsForUser', () => {
	let dataTableServiceMock = mock<DataTableService>();
	let dataTableAggregateServiceMock = mock<DataTableAggregateService>();
	let loggerMock = mock<Logger>();
	let sourceControlPreferencesServiceMock = mock<SourceControlPreferencesService>();
	let dataTableProxyService: DataTableProxyService;
	let userHasScopesSpy: jest.SpyInstance;

	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		dataTableServiceMock = mock<DataTableService>();
		dataTableAggregateServiceMock = mock<DataTableAggregateService>();
		loggerMock = mock<Logger>();
		sourceControlPreferencesServiceMock = mock<SourceControlPreferencesService>();
		sourceControlPreferencesServiceMock.getPreferences.mockReturnValue({
			branchReadOnly: false,
		} as ReturnType<SourceControlPreferencesService['getPreferences']>);

		dataTableProxyService = new DataTableProxyService(
			dataTableServiceMock,
			dataTableAggregateServiceMock,
			mock<OwnershipService>(),
			loggerMock,
			sourceControlPreferencesServiceMock,
		);

		userHasScopesSpy = jest.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('getManyAndCount', () => {
		it('should delegate to DataTableAggregateService with user', async () => {
			const options = { filter: { name: 'test' } } as ListDataTableQueryDto;
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.getManyAndCount(options);

			expect(dataTableAggregateServiceMock.getManyAndCount).toHaveBeenCalledWith(user, options);
		});
	});

	describe('dataTable:create scope', () => {
		it('should allow createDataTable when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.createDataTable(PROJECT_ID, { name: 'test', columns: [] });

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:create'], false, {
				projectId: PROJECT_ID,
			});
			expect(dataTableServiceMock.createDataTable).toHaveBeenCalledWith(PROJECT_ID, {
				name: 'test',
				columns: [],
			});
		});

		it('should reject createDataTable when user lacks scope', async () => {
			userHasScopesSpy.mockResolvedValue(false);
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await expect(ops.createDataTable(PROJECT_ID, { name: 'test', columns: [] })).rejects.toThrow(
				"User does not have 'dataTable:create' access on project",
			);

			expect(dataTableServiceMock.createDataTable).not.toHaveBeenCalled();
		});
	});

	describe('dataTable:read scope', () => {
		it('should allow getColumns when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.getColumns('dt-1', PROJECT_ID);

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:read'], false, {
				projectId: PROJECT_ID,
			});
			expect(dataTableServiceMock.getColumns).toHaveBeenCalledWith('dt-1', PROJECT_ID);
		});

		it('should reject getColumns when user lacks scope', async () => {
			userHasScopesSpy.mockResolvedValue(false);
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await expect(ops.getColumns('dt-1', PROJECT_ID)).rejects.toThrow(
				"User does not have 'dataTable:read' access on project",
			);

			expect(dataTableServiceMock.getColumns).not.toHaveBeenCalled();
		});
	});

	describe('dataTable:update scope', () => {
		it('should allow updateDataTable when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.updateDataTable('dt-1', PROJECT_ID, { name: 'renamed' });

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:update'], false, {
				projectId: PROJECT_ID,
			});
			expect(dataTableServiceMock.updateDataTable).toHaveBeenCalledWith('dt-1', PROJECT_ID, {
				name: 'renamed',
			});
		});

		it('should allow addColumn when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.addColumn('dt-1', PROJECT_ID, { name: 'col', type: 'string' });

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:update'], false, {
				projectId: PROJECT_ID,
			});
		});

		it('should allow deleteColumn when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.deleteColumn('dt-1', PROJECT_ID, 'col-1');

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:update'], false, {
				projectId: PROJECT_ID,
			});
		});

		it('should allow renameColumn when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.renameColumn('dt-1', PROJECT_ID, 'col-1', { name: 'new_name' });

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:update'], false, {
				projectId: PROJECT_ID,
			});
		});

		it('should reject updateDataTable when user lacks scope', async () => {
			userHasScopesSpy.mockResolvedValue(false);
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await expect(ops.updateDataTable('dt-1', PROJECT_ID, { name: 'renamed' })).rejects.toThrow(
				"User does not have 'dataTable:update' access on project",
			);

			expect(dataTableServiceMock.updateDataTable).not.toHaveBeenCalled();
		});
	});

	describe('dataTable:delete scope', () => {
		it('should allow deleteDataTable when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.deleteDataTable('dt-1', PROJECT_ID);

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:delete'], false, {
				projectId: PROJECT_ID,
			});
			expect(dataTableServiceMock.deleteDataTable).toHaveBeenCalledWith('dt-1', PROJECT_ID);
		});

		it('should reject deleteDataTable when user lacks scope', async () => {
			userHasScopesSpy.mockResolvedValue(false);
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await expect(ops.deleteDataTable('dt-1', PROJECT_ID)).rejects.toThrow(
				"User does not have 'dataTable:delete' access on project",
			);

			expect(dataTableServiceMock.deleteDataTable).not.toHaveBeenCalled();
		});
	});

	describe('dataTable:readRow scope', () => {
		it('should allow getManyRowsAndCount when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await ops.getManyRowsAndCount('dt-1', PROJECT_ID, {});

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:readRow'], false, {
				projectId: PROJECT_ID,
			});
			expect(dataTableServiceMock.getManyRowsAndCount).toHaveBeenCalledWith('dt-1', PROJECT_ID, {});
		});

		it('should reject getManyRowsAndCount when user lacks scope', async () => {
			userHasScopesSpy.mockResolvedValue(false);
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await expect(ops.getManyRowsAndCount('dt-1', PROJECT_ID, {})).rejects.toThrow(
				"User does not have 'dataTable:readRow' access on project",
			);

			expect(dataTableServiceMock.getManyRowsAndCount).not.toHaveBeenCalled();
		});
	});

	describe('dataTable:writeRow scope', () => {
		it('should allow insertRows when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			const rows = [{ name: 'test' }];

			await ops.insertRows('dt-1', PROJECT_ID, rows, 'count');

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:writeRow'], false, {
				projectId: PROJECT_ID,
			});
			expect(dataTableServiceMock.insertRows).toHaveBeenCalledWith(
				'dt-1',
				PROJECT_ID,
				rows,
				'count',
			);
		});

		it('should allow updateRows when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			const options = {
				filter: {
					filters: [{ columnName: 'x', condition: 'eq' as const, value: 'y' }],
					type: 'and' as const,
				},
				data: { x: 'z' },
			};

			await ops.updateRows('dt-1', PROJECT_ID, options);

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:writeRow'], false, {
				projectId: PROJECT_ID,
			});
		});

		it('should allow deleteRows when user has scope', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			const options = {
				filter: {
					filters: [{ columnName: 'x', condition: 'eq' as const, value: 'y' }],
					type: 'and' as const,
				},
			};

			await ops.deleteRows('dt-1', PROJECT_ID, options);

			expect(userHasScopesSpy).toHaveBeenCalledWith(user, ['dataTable:writeRow'], false, {
				projectId: PROJECT_ID,
			});
		});

		it('should reject insertRows when user lacks scope', async () => {
			userHasScopesSpy.mockResolvedValue(false);
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);

			await expect(ops.insertRows('dt-1', PROJECT_ID, [{ name: 'test' }], 'count')).rejects.toThrow(
				"User does not have 'dataTable:writeRow' access on project",
			);

			expect(dataTableServiceMock.insertRows).not.toHaveBeenCalled();
		});
	});

	describe('read-only instance protection', () => {
		beforeEach(() => {
			sourceControlPreferencesServiceMock.getPreferences.mockReturnValue({
				branchReadOnly: true,
			} as ReturnType<SourceControlPreferencesService['getPreferences']>);
		});

		it('should reject createDataTable on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(ops.createDataTable(PROJECT_ID, { name: 'test', columns: [] })).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.createDataTable).not.toHaveBeenCalled();
		});

		it('should reject updateDataTable on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(ops.updateDataTable('dt-1', PROJECT_ID, { name: 'renamed' })).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.updateDataTable).not.toHaveBeenCalled();
		});

		it('should reject addColumn on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(
				ops.addColumn('dt-1', PROJECT_ID, { name: 'col', type: 'string' }),
			).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.addColumn).not.toHaveBeenCalled();
		});

		it('should reject deleteColumn on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(ops.deleteColumn('dt-1', PROJECT_ID, 'col-1')).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.deleteColumn).not.toHaveBeenCalled();
		});

		it('should reject renameColumn on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(
				ops.renameColumn('dt-1', PROJECT_ID, 'col-1', { name: 'new_name' }),
			).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.renameColumn).not.toHaveBeenCalled();
		});

		it('should reject deleteDataTable on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(ops.deleteDataTable('dt-1', PROJECT_ID)).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.deleteDataTable).not.toHaveBeenCalled();
		});

		it('should reject insertRows on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(ops.insertRows('dt-1', PROJECT_ID, [{ name: 'test' }], 'count')).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.insertRows).not.toHaveBeenCalled();
		});

		it('should reject updateRows on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(
				ops.updateRows('dt-1', PROJECT_ID, {
					filter: { filters: [{ columnName: 'x', condition: 'eq', value: 'y' }], type: 'and' },
					data: { x: 'z' },
				}),
			).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.updateRows).not.toHaveBeenCalled();
		});

		it('should reject deleteRows on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await expect(
				ops.deleteRows('dt-1', PROJECT_ID, {
					filter: { filters: [{ columnName: 'x', condition: 'eq', value: 'y' }], type: 'and' },
				}),
			).rejects.toThrow(
				'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
			);
			expect(dataTableServiceMock.deleteRows).not.toHaveBeenCalled();
		});

		it('should allow getColumns on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await ops.getColumns('dt-1', PROJECT_ID);
			expect(dataTableServiceMock.getColumns).toHaveBeenCalled();
		});

		it('should allow getManyRowsAndCount on a read-only instance', async () => {
			const ops = dataTableProxyService.makeDataTableOperationsForUser(user);
			await ops.getManyRowsAndCount('dt-1', PROJECT_ID, {});
			expect(dataTableServiceMock.getManyRowsAndCount).toHaveBeenCalled();
		});
	});
});
