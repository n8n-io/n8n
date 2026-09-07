import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { DataTableConfig } from '@n8n/config';
import {
	DataTableMutationEventRepository,
	DataTableTriggerDeliveryRepository,
	DataTableTriggerSubscriptionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableService } from '../data-table.service';
import { mockDataTableSizeValidator } from './test-helpers';

describe('Data Table durable triggers', () => {
	let dataTableService: DataTableService;
	let config: DataTableConfig;

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
		await testDb.init();
		mockDataTableSizeValidator();
		dataTableService = Container.get(DataTableService);
		config = Container.get(DataTableConfig);
	});

	beforeEach(async () => {
		config.triggerEnabled = true;
		await testDb.truncate([
			'DataTableTriggerDelivery',
			'DataTableMutationEvent',
			'DataTableTriggerSubscription',
			'DataTable',
			'DataTableColumn',
		]);
	});

	afterEach(async () => {
		await dataTableService.deleteDataTableAll();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('records an inserted row and its frozen recipient in the mutation transaction', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const table = await dataTableService.createDataTable(project.id, {
			name: 'priorities',
			columns: [{ name: 'priority', type: 'enum', options: ['Low', 'High'] }],
		});
		expect(table.columns[0].options).toEqual(['Low', 'High']);
		await Container.get(DataTableTriggerSubscriptionRepository).replaceForWorkflow(workflow.id, [
			{
				workflowId: workflow.id,
				nodeId: 'trigger-node-id',
				projectId: project.id,
				dataTableId: table.id,
				event: 'rowInserted',
				columnId: null,
			},
		]);

		const [row] = await dataTableService.insertRows(
			table.id,
			project.id,
			[{ priority: 'High' }],
			'all',
		);

		const event = await Container.get(DataTableMutationEventRepository).findOneByOrFail({
			dataTableId: table.id,
			rowId: row.id,
		});
		const delivery = await Container.get(DataTableTriggerDeliveryRepository).findOneByOrFail({
			eventId: event.id,
		});

		expect(event.payload).toMatchObject({
			event: 'rowInserted',
			dataTableId: table.id,
			rowId: row.id,
			row: { priority: 'High' },
		});
		expect(delivery).toMatchObject({
			workflowId: workflow.id,
			nodeId: 'trigger-node-id',
			status: 'pending',
			executionId: null,
		});

		const deliveryRepository = Container.get(DataTableTriggerDeliveryRepository);
		const claims = await Promise.all([
			deliveryRepository.claimNext('main-a', 30_000),
			deliveryRepository.claimNext('main-b', 30_000),
		]);
		expect(claims.filter((claim) => claim !== null)).toHaveLength(1);
	});

	it('rejects a value that is not configured for an enum column', async () => {
		const project = await createTeamProject();
		const table = await dataTableService.createDataTable(project.id, {
			name: 'priorities',
			columns: [{ name: 'priority', type: 'enum', options: ['Low', 'High'] }],
		});

		await expect(
			dataTableService.insertRows(table.id, project.id, [{ priority: 'Medium' }]),
		).rejects.toThrow("value 'Medium' is not an option for enum column 'priority'");
	});

	it('applies the enum default only when an inserted row omits the column', async () => {
		const project = await createTeamProject();
		const table = await dataTableService.createDataTable(project.id, {
			name: 'priorities',
			columns: [
				{
					name: 'priority',
					type: 'enum',
					options: ['Low', 'High'],
					defaultValue: 'Low',
				},
			],
		});

		const rows = await dataTableService.insertRows(
			table.id,
			project.id,
			[{}, { priority: 'High' }],
			'all',
		);

		expect(rows).toEqual([
			expect.objectContaining({ priority: 'Low' }),
			expect.objectContaining({ priority: 'High' }),
		]);
	});

	it('rolls the row insert back when durable event persistence fails', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const table = await dataTableService.createDataTable(project.id, {
			name: 'rollback_test',
			columns: [{ name: 'value', type: 'string' }],
		});
		await Container.get(DataTableTriggerSubscriptionRepository).replaceForWorkflow(workflow.id, [
			{
				workflowId: workflow.id,
				nodeId: 'trigger-node-id',
				projectId: project.id,
				dataTableId: table.id,
				event: 'rowInserted',
				columnId: null,
			},
		]);
		vi.spyOn(
			Container.get(DataTableMutationEventRepository),
			'createWithDeliveries',
		).mockRejectedValueOnce(new Error('event persistence failed'));

		await expect(
			dataTableService.insertRows(table.id, project.id, [{ value: 'not committed' }]),
		).rejects.toThrow('event persistence failed');
		await expect(
			dataTableService.getManyRowsAndCount(table.id, project.id, { take: 10 }),
		).resolves.toMatchObject({ count: 0, data: [] });
	});
});
