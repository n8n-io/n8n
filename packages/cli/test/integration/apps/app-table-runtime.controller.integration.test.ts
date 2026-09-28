import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AppRepository } from '@/modules/apps/app.repository';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { createDataTable } from '@test-integration/db/data-tables';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** The served page calls the runtime API without a session and without the `/rest` prefix. */
let visitor: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps', 'data-table'],
});

let appRepository: AppRepository;

const ROWS = '/apps/board/api/tables/tasks/rows';

const createTasksTable = async () =>
	await createDataTable(ownerProject, {
		name: 'Tasks',
		columns: [
			{ name: 'title', type: 'string' },
			{ name: 'points', type: 'number' },
			{ name: 'done', type: 'boolean' },
		],
		data: [
			{ title: 'Write spec', points: 3, done: true },
			{ title: 'Build app', points: 5, done: false },
			{ title: 'Ship it', points: 1, done: false },
		],
	});

const createBoundApp = async (
	dataTableId: string,
	permissions: Array<'read' | 'write'> = ['read', 'write'],
) => {
	const app = await appRepository.createApp(ownerProject.id, 'Board', 'board');
	return await appRepository.updateBindings(app, [
		{ key: 'tasks', kind: 'dataTable', dataTableId, permissions },
	]);
};

const filterOf = (columnName: string, value: string | number | boolean) =>
	JSON.stringify({ filters: [{ columnName, value }] });

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
	authOwnerAgent = testServer.authAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['App']);
	await Container.get(DataTableRepository).deleteDataTableAll();
});

describe('GET /apps/:namespace/api/tables/:key/rows', () => {
	test('lists the rows with filter, sort and take', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.get(ROWS)
			.query({ filter: filterOf('done', false), sortBy: 'points:desc', take: '1' })
			.set('Origin', 'null')
			.expect(200);

		expect(response.body.count).toBe(2);
		expect(response.body.data).toEqual([
			expect.objectContaining({
				id: expect.any(Number),
				title: 'Build app',
				points: 5,
				done: false,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		]);
		expect(response.headers['access-control-allow-origin']).toBe('null');
		expect(response.headers['access-control-allow-credentials']).toBeUndefined();
	});

	test('answers 400 invalid_input for a filter on an unknown column', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.get(ROWS)
			.query({ filter: filterOf('nope', 1) })
			.expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
	});

	test('answers 404 binding_not_found for a key the app has not bound', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor.get('/apps/board/api/tables/nope/rows').expect(404);

		expect(response.body).toMatchObject({ code: 'binding_not_found' });
	});

	test('answers 404 app_not_found for a namespace no app owns', async () => {
		const response = await visitor.get('/apps/nobody/api/tables/tasks/rows').expect(404);

		expect(response.body).toMatchObject({ code: 'app_not_found' });
	});

	test('answers 404 table_not_found after the bound table is deleted', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);
		await Container.get(DataTableRepository).deleteDataTable(table.id);

		const response = await visitor.get(ROWS).expect(404);

		expect(response.body).toMatchObject({ code: 'table_not_found' });
	});
});

describe('POST /apps/:namespace/api/tables/:key/rows', () => {
	test('inserts the rows and answers 201 with the stored rows', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.post(ROWS)
			.set('Origin', 'null')
			.send({
				data: [{ title: 'A', points: 1 }, { title: 'B', points: 2, done: true }, { title: 'C' }],
			})
			.expect(201);

		expect(response.body.data).toEqual([
			expect.objectContaining({ id: expect.any(Number), title: 'A', points: 1, done: null }),
			expect.objectContaining({ id: expect.any(Number), title: 'B', points: 2, done: true }),
			expect.objectContaining({ id: expect.any(Number), title: 'C', points: null, done: null }),
		]);
		const listed = await visitor.get(ROWS).query({ take: '250' }).expect(200);
		expect(listed.body.count).toBe(6);
	});

	test('answers 400 invalid_input for more than 100 rows', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.post(ROWS)
			.send({ data: Array.from({ length: 101 }, (_, i) => ({ title: `Row ${i}` })) })
			.expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
		expect(response.body.issues).toEqual([{ path: ['data'], code: 'too_big' }]);
	});

	test('answers 403 permission_denied for a read-only binding', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id, ['read']);

		const response = await visitor
			.post(ROWS)
			.send({ data: [{ title: 'A' }] })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'permission_denied' });
		const listed = await visitor.get(ROWS).expect(200);
		expect(listed.body.count).toBe(3);
	});

	test('answers 403 forbidden_origin to another site without inserting', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.post(ROWS)
			.set('Origin', 'https://evil.example')
			.send({ data: [{ title: 'A' }] })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'forbidden_origin' });
		expect(response.headers['access-control-allow-origin']).toBeUndefined();
		const listed = await visitor.get(ROWS).expect(200);
		expect(listed.body.count).toBe(3);
	});
});

describe('PATCH /apps/:namespace/api/tables/:key/rows', () => {
	test('updates the rows matching the filter and answers with them', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);
		const listed = await visitor.get(ROWS).query({ filter: filterOf('title', 'Ship it') });
		const [row] = listed.body.data;

		const response = await visitor
			.patch(ROWS)
			.send({ filter: { filters: [{ columnName: 'id', value: row.id }] }, data: { done: true } })
			.expect(200);

		expect(response.body.data).toEqual([
			expect.objectContaining({ id: row.id, title: 'Ship it', done: true }),
		]);
	});

	test('answers 400 invalid_input for an empty filter', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.patch(ROWS)
			.send({ filter: { filters: [] }, data: { done: true } })
			.expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
	});

	test('answers 403 permission_denied for a read-only binding', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id, ['read']);

		const response = await visitor
			.patch(ROWS)
			.send({ filter: { filters: [{ columnName: 'done', value: false }] }, data: { done: true } })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'permission_denied' });
	});

	test('answers 403 forbidden_origin to another site', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.patch(ROWS)
			.set('Origin', 'https://evil.example')
			.send({ filter: { filters: [{ columnName: 'done', value: false }] }, data: { done: true } })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'forbidden_origin' });
	});
});

describe('DELETE /apps/:namespace/api/tables/:key/rows', () => {
	test('deletes the rows matching the filter and answers with them', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.delete(ROWS)
			.query({ filter: filterOf('done', false) })
			.expect(200);

		expect(response.body.data).toEqual([
			expect.objectContaining({ title: 'Build app' }),
			expect.objectContaining({ title: 'Ship it' }),
		]);
		const listed = await visitor.get(ROWS).expect(200);
		expect(listed.body.count).toBe(1);
	});

	test('answers 400 invalid_input without a filter', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor.delete(ROWS).expect(400);

		expect(response.body).toMatchObject({ code: 'invalid_input' });
	});

	test('answers 403 permission_denied for a read-only binding', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id, ['read']);

		const response = await visitor
			.delete(ROWS)
			.query({ filter: filterOf('done', false) })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'permission_denied' });
	});

	test('answers 403 forbidden_origin to another site', async () => {
		const table = await createTasksTable();
		await createBoundApp(table.id);

		const response = await visitor
			.delete(ROWS)
			.set('Origin', 'https://evil.example')
			.query({ filter: filterOf('done', false) })
			.expect(403);

		expect(response.body).toMatchObject({ code: 'forbidden_origin' });
	});
});

describe('OPTIONS /apps/:namespace/api/tables/:key/rows', () => {
	test('lists the four methods for the opaque-origin page', async () => {
		const response = await visitor
			.options(ROWS)
			.set('Origin', 'null')
			.set('Access-Control-Request-Method', 'PATCH')
			.expect(204);

		expect(response.headers['access-control-allow-origin']).toBe('null');
		expect(response.headers['access-control-allow-methods']).toBe(
			'GET, POST, PATCH, DELETE, OPTIONS',
		);
	});
});

describe('GET /projects/:projectId/apps/:appId/bindings', () => {
	test('describes the data table binding, and marks it missing once the table is deleted', async () => {
		const table = await createTasksTable();
		const app = await createBoundApp(table.id, ['read']);
		const url = `/projects/${ownerProject.id}/apps/${app.id}/bindings`;

		const described = await authOwnerAgent.get(url).expect(200);

		expect(described.body.data).toEqual({
			bindings: [
				{
					key: 'tasks',
					kind: 'dataTable',
					dataTableId: table.id,
					name: 'Tasks',
					permissions: ['read'],
					columns: [
						{ name: 'title', type: 'string' },
						{ name: 'points', type: 'number' },
						{ name: 'done', type: 'boolean' },
					],
					row: {
						type: 'object',
						properties: {
							id: { type: 'number' },
							createdAt: { type: 'string', format: 'date-time' },
							updatedAt: { type: 'string', format: 'date-time' },
							title: { type: ['string', 'null'] },
							points: { type: ['number', 'null'] },
							done: { type: ['boolean', 'null'] },
						},
						required: ['id', 'createdAt', 'updatedAt', 'title', 'points', 'done'],
						additionalProperties: false,
					},
				},
			],
			warnings: [],
		});

		await Container.get(DataTableRepository).deleteDataTable(table.id);
		const missing = await authOwnerAgent.get(url).expect(200);

		expect(missing.body.data).toEqual({
			bindings: [{ key: 'tasks', kind: 'dataTable', name: 'tasks', missing: true }],
			warnings: [
				`Binding 'tasks': data table '${table.id}' no longer exists in the app's project.`,
			],
		});
	});
});
