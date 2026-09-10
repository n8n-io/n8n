import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { createUser } from '@test-integration/db/users';

import { createTelemetry } from './test-utils';
import { createGetDataTableRowsTool } from '../../tools/data-table';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('get_data_table_rows against a real database', () => {
	let user: User;
	let project: Project;
	let dataTableId: string;
	let insertedIds: number[];
	let tool: ReturnType<typeof createGetDataTableRowsTool>;

	const callHandler = async (args: Omit<Parameters<typeof tool.handler>[0], 'dataTableId'>) =>
		await tool.handler({ dataTableId, ...args }, {} as never);

	beforeEach(async () => {
		user = await createUser({ role: GLOBAL_OWNER_ROLE });
		project = await createTeamProject(undefined, user);
		const dataTableOps = Container.get(DataTableProxyService).makeDataTableOperationsForUser(user);
		tool = createGetDataTableRowsTool(user, dataTableOps, createTelemetry());

		const created = await Container.get(DataTableService).createDataTable(project.id, {
			name: 'people',
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'joinedAt', type: 'date' },
			],
		});
		dataTableId = created.id;

		const inserted = await dataTableOps.insertRows(
			dataTableId,
			project.id,
			[
				{ name: 'Alice', age: 30, joinedAt: '2024-03-01T00:00:00.000Z' },
				{ name: 'Bob', age: 25, joinedAt: null },
				{ name: 'Carol', age: 35, joinedAt: '2024-05-01T00:00:00.000Z' },
			],
			'id',
		);
		insertedIds = inserted.map((row) => row.id);
	});

	it('filters on the id system column', async () => {
		const result = await callHandler({
			projectId: project.id,
			filter: {
				type: 'and',
				filters: [{ columnName: 'id', condition: 'gt', value: insertedIds[0] }],
			},
		});

		expect(result.isError).toBeUndefined();
		const output = result.structuredContent as { rows: Array<Record<string, unknown>> };
		expect(output.rows.map((row) => row.name)).toEqual(['Bob', 'Carol']);
	});

	it('matches null values with eq', async () => {
		const result = await callHandler({
			projectId: project.id,
			filter: {
				type: 'and',
				filters: [{ columnName: 'joinedAt', condition: 'eq', value: null }],
			},
		});

		expect(result.isError).toBeUndefined();
		const output = result.structuredContent as { rows: Array<Record<string, unknown>> };
		expect(output.rows.map((row) => row.name)).toEqual(['Bob']);
	});

	it('filters date columns by ISO 8601 string', async () => {
		const result = await callHandler({
			projectId: project.id,
			filter: {
				type: 'and',
				filters: [{ columnName: 'joinedAt', condition: 'gte', value: '2024-04-01T00:00:00.000Z' }],
			},
		});

		expect(result.isError).toBeUndefined();
		const output = result.structuredContent as { rows: Array<Record<string, unknown>> };
		expect(output.rows.map((row) => row.name)).toEqual(['Carol']);
	});

	it('sorts descending and paginates', async () => {
		const result = await callHandler({
			projectId: project.id,
			sortBy: 'age:desc',
			limit: 2,
			skip: 1,
		});

		expect(result.isError).toBeUndefined();
		const output = result.structuredContent as {
			rows: Array<Record<string, unknown>>;
			count: number;
		};
		expect(output.rows.map((row) => row.name)).toEqual(['Alice', 'Bob']);
		expect(output.count).toBe(3);
	});
});
