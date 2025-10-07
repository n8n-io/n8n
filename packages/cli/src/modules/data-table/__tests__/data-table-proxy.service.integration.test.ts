import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type {
	AddDataTableColumnOptions,
	INode,
	ListDataTableRowsOptions,
	MoveDataTableColumnOptions,
	UpsertDataTableRowOptions,
	Workflow,
} from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';

import { DataTableProxyService } from '../data-table-proxy.service';
import type { DataTableService } from '../data-table.service';

const PROJECT_ID = 'project-id';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});
describe('DataTableProxyService', () => {
	let dataTableServiceMock = mock<DataTableService>();
	let ownershipServiceMock = mock<OwnershipService>();
	let loggerMock = mock<Logger>();
	let dataTableProxyService: DataTableProxyService;

	let workflow: Workflow;
	let node: INode;
	let project: Project;

	beforeEach(() => {
		dataTableServiceMock = mock<DataTableService>();
		ownershipServiceMock = mock<OwnershipService>();
		loggerMock = mock<Logger>();

		dataTableProxyService = new DataTableProxyService(
			dataTableServiceMock,
			ownershipServiceMock,
			loggerMock,
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
