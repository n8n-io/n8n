import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import {
	DataTableMutationEventRepository,
	DataTableRowAutomationRepository,
	DataTableTriggerDeliveryRepository,
	DataTableTriggerSubscriptionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableService } from '../data-table.service';
import { DataTableMutationEventRecorder } from '../data-table-mutation-event.repository';
import { mockDataTableSizeValidator } from './test-helpers';

const priorityOptions = [
	{ id: 'low', text: 'Low', color: '#6366F1' },
	{ id: 'high', text: 'High', color: '#14B8A6' },
];

describe('Data Table durable triggers', () => {
	let dataTableService: DataTableService;

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
		await testDb.init();
		mockDataTableSizeValidator();
		dataTableService = Container.get(DataTableService);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'DataTableRowAutomation',
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
			columns: [{ name: 'priority', type: 'enum', options: priorityOptions }],
		});
		expect(table.columns[0].options).toEqual(priorityOptions);
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
			[{ priority: 'high' }],
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
			row: { priority: 'high' },
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

	it('tracks the trigger state of a row and exposes it as automationStatus', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({ name: 'Process rows' }, project);
		const table = await dataTableService.createDataTable(project.id, {
			name: 'queue',
			columns: [{ name: 'title', type: 'string' }],
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

		const [first, second] = await dataTableService.insertRows(
			table.id,
			project.id,
			[{ title: 'first' }, { title: 'second' }],
			'all',
		);
		const automationRepository = Container.get(DataTableRowAutomationRepository);
		const key = { dataTableId: table.id, workflowId: workflow.id, nodeId: 'trigger-node-id' };
		await automationRepository.setStatus([
			{ ...key, rowId: first.id, status: 'running', executionId: '4242', error: null },
		]);
		await automationRepository.finishExecution('4242', 'failed', 'boom');

		const { data } = await dataTableService.getManyRowsAndCount(table.id, project.id, {
			skip: 0,
			take: 10,
			sortBy: ['id', 'ASC'],
		});
		expect(data[0]).toMatchObject({
			id: first.id,
			automationStatus: 'failed',
			automations: [
				expect.objectContaining({
					workflowName: 'Process rows',
					status: 'failed',
					executionId: '4242',
					executionExists: false,
					error: 'boom',
				}),
			],
		});
		expect(data[1]).toMatchObject({ id: second.id, automationStatus: 'waiting' });

		const { data: waiting } = await dataTableService.getManyRowsAndCount(table.id, project.id, {
			skip: 0,
			take: 10,
			filter: {
				type: 'and',
				filters: [{ columnName: 'automationStatus', condition: 'eq', value: 'waiting' }],
			},
		});
		expect(waiting.map((row) => row.id)).toEqual([second.id]);

		const { data: byStatus } = await dataTableService.getManyRowsAndCount(table.id, project.id, {
			skip: 0,
			take: 10,
			sortBy: ['automationStatus', 'DESC'],
		});
		expect(byStatus.map((row) => row.id)).toEqual([second.id, first.id]);

		await dataTableService.deleteRows(table.id, project.id, {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: first.id }] },
		});
		expect(await automationRepository.countBy({ dataTableId: table.id })).toBe(1);

		await automationRepository.deleteForWorkflowExcept(workflow.id, []);
		expect(await automationRepository.countBy({ dataTableId: table.id })).toBe(0);
	});

	it('rejects a value that is not configured for an enum column', async () => {
		const project = await createTeamProject();
		const table = await dataTableService.createDataTable(project.id, {
			name: 'priorities',
			columns: [{ name: 'priority', type: 'enum', options: priorityOptions }],
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
					options: priorityOptions,
					defaultValue: 'low',
				},
			],
		});

		const rows = await dataTableService.insertRows(
			table.id,
			project.id,
			[{}, { priority: 'high' }],
			'all',
		);

		expect(rows).toEqual([
			expect.objectContaining({ priority: 'low' }),
			expect.objectContaining({ priority: 'high' }),
		]);
	});

	it('notifies a manual trigger listener without a published subscription', async () => {
		const project = await createTeamProject();
		const table = await dataTableService.createDataTable(project.id, {
			name: 'manual_trigger_test',
			columns: [{ name: 'value', type: 'string' }],
		});
		const payloadReceived = new Promise<{ rowId: number }>((resolve) => {
			const stopListening = Container.get(DataTableMutationEventRecorder).listen(
				table.id,
				'rowInserted',
				null,
				(payload) => {
					stopListening();
					resolve(payload);
				},
			);
		});

		await dataTableService.insertRows(table.id, project.id, [{ value: 'created' }]);

		await expect(payloadReceived).resolves.toMatchObject({
			event: 'rowInserted',
			dataTableId: table.id,
			row: { value: 'created' },
		});
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
