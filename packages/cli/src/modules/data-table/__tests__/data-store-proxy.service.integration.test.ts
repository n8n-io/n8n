import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type {
	AddDataStoreColumnOptions,
	INode,
	ListDataStoreRowsOptions,
	MoveDataStoreColumnOptions,
	UpsertDataStoreRowOptions,
	Workflow,
} from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';

import { DataStoreProxyService } from '../data-store-proxy.service';
import type { DataStoreService } from '../data-store.service';

const PROJECT_ID = 'project-id';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});
describe('DataStoreProxyService', () => {
	let dataStoreServiceMock = mock<DataStoreService>();
	let ownershipServiceMock = mock<OwnershipService>();
	let loggerMock = mock<Logger>();
	let dataStoreProxyService: DataStoreProxyService;

	let workflow: Workflow;
	let node: INode;
	let project: Project;

	beforeEach(() => {
		dataStoreServiceMock = mock<DataStoreService>();
		ownershipServiceMock = mock<OwnershipService>();
		loggerMock = mock<Logger>();

		dataStoreProxyService = new DataStoreProxyService(
			dataStoreServiceMock,
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

			const aggregateOperations = await dataStoreProxyService.getDataStoreAggregateProxy(
				workflow,
				node,
			);
			await aggregateOperations.getManyAndCount(options);

			expect(dataStoreServiceMock.getManyAndCount).toBeCalledWith({
				filter: { name: 'test', projectId: PROJECT_ID },
			});
		});

		it('should call createDataStore with correct parameters', async () => {
			const options = { name: 'newDataStore', columns: [] };

			const aggregateOperations = await dataStoreProxyService.getDataStoreAggregateProxy(
				workflow,
				node,
			);
			await aggregateOperations.createDataStore(options);

			expect(dataStoreServiceMock.createDataStore).toBeCalledWith(PROJECT_ID, options);
		});

		it('should call deleteDataStoreByProject when proxy calls deleteDataStoreAll', async () => {
			const aggregateOperations = await dataStoreProxyService.getDataStoreAggregateProxy(
				workflow,
				node,
			);
			await aggregateOperations.deleteDataStoreAll();

			expect(dataStoreServiceMock.deleteDataStoreByProjectId).toBeCalledWith(PROJECT_ID);
		});
	});
	it('should call updateDataStore with correct parameters', async () => {
		const options = { name: 'updatedDataStore' };

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.updateDataStore(options);

		expect(dataStoreServiceMock.updateDataStore).toBeCalledWith(
			'dataStore-id',
			PROJECT_ID,
			options,
		);
	});

	it('should call deleteDataStore with correct parameters', async () => {
		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.deleteDataStore();

		expect(dataStoreServiceMock.deleteDataStore).toBeCalledWith('dataStore-id', PROJECT_ID);
	});

	it('should call getColumns with correct parameters', async () => {
		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.getColumns();

		expect(dataStoreServiceMock.getColumns).toBeCalledWith('dataStore-id', PROJECT_ID);
	});

	it('should call addColumn with correct parameters', async () => {
		const options: AddDataStoreColumnOptions = { name: 'newColumn', type: 'string' };

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.addColumn(options);

		expect(dataStoreServiceMock.addColumn).toBeCalledWith('dataStore-id', PROJECT_ID, options);
	});

	it('should call moveColumn with correct parameters', async () => {
		const columnId = 'column-id';
		const options: MoveDataStoreColumnOptions = { targetIndex: 1 };

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.moveColumn(columnId, options);

		expect(dataStoreServiceMock.moveColumn).toBeCalledWith(
			'dataStore-id',
			PROJECT_ID,
			columnId,
			options,
		);
	});

	it('should call deleteColumn with correct parameters', async () => {
		const columnId = 'column-id';

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.deleteColumn(columnId);

		expect(dataStoreServiceMock.deleteColumn).toBeCalledWith('dataStore-id', PROJECT_ID, columnId);
	});

	it('should call getManyRowsAndCount with correct parameters', async () => {
		const options: ListDataStoreRowsOptions = {
			filter: {
				filters: [{ columnName: 'x', condition: 'eq', value: 'testRow' }],
				type: 'and',
			},
		};

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.getManyRowsAndCount(options);

		expect(dataStoreServiceMock.getManyRowsAndCount).toBeCalledWith(
			'dataStore-id',
			PROJECT_ID,
			options,
		);
	});

	it('should call insertRows with correct parameters', async () => {
		const rows = [{ id: 1, name: 'row1' }];

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.insertRows(rows, 'count');

		expect(dataStoreServiceMock.insertRows).toBeCalledWith(
			'dataStore-id',
			PROJECT_ID,
			rows,
			'count',
		);
	});

	it('should call upsertRow with correct parameters', async () => {
		const options: UpsertDataStoreRowOptions = {
			filter: {
				filters: [{ columnName: 'name', condition: 'eq', value: 'test' }],
				type: 'and',
			},
			data: { name: 'newName' },
		};

		const dataStoreOperations = await dataStoreProxyService.getDataStoreProxy(
			workflow,
			node,
			'dataStore-id',
		);
		await dataStoreOperations.upsertRow(options);

		expect(dataStoreServiceMock.upsertRow).toBeCalledWith(
			'dataStore-id',
			PROJECT_ID,
			options,
			true,
		);
	});
});
