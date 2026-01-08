import { testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import type { DataTable } from '@/modules/data-table/data-table.entity';

import { createDataTable } from '../shared/db/data-tables';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let ownerPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['data-table'],
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();

	const projectRepository = Container.get(ProjectRepository);
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
});

beforeEach(async () => {
	// Note: DataTable entities will be cascade deleted when projects are truncated
	await testDb.truncate(['ProjectRelation', 'Project']);

	// Recreate personal projects
	const projectRepository = Container.get(ProjectRepository);
	const projectRelationRepository = Container.get(ProjectRelationRepository);

	const createPersonalProject = async (user: User) => {
		const project = await projectRepository.save(
			projectRepository.create({
				type: 'personal',
				name: user.createPersonalProjectName(),
				creatorId: user.id,
			}),
		);

		await projectRelationRepository.save(
			projectRelationRepository.create({
				projectId: project.id,
				userId: user.id,
				role: { slug: 'project:personalOwner' },
			}),
		);

		return project;
	};

	ownerPersonalProject = await createPersonalProject(owner);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

const testWithAPIKey =
	(method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, apiKey: string | null) =>
	async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

describe('GET /data-tables/:dataTableId/rows', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/data-tables/123/rows', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('get', '/data-tables/123/rows', 'abcXYZ'),
	);

	test('should return 404 for non-existing data table', async () => {
		const nonExistentId = 'abcd1234efgh5678'; // Valid nanoid format but doesn't exist
		const response = await authOwnerAgent.get(`/data-tables/${nonExistentId}/rows`);

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${nonExistentId}'`,
		);
	});

	test('should retrieve rows from own data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
		});

		const response = await authOwnerAgent.get(`/data-tables/${dataTable.id}/rows`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.count).toBe(2);

		const row = response.body.data[0];
		expect(row).toHaveProperty('id');
		expect(row).toHaveProperty('name');
		expect(row).toHaveProperty('age');
		expect(row).toHaveProperty('createdAt');
		expect(row).toHaveProperty('updatedAt');
	});

	test('should sort rows by column ascending', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [
				{ name: 'Charlie', age: 35 },
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'name:asc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data[0].name).toBe('Alice');
		expect(response.body.data[1].name).toBe('Bob');
		expect(response.body.data[2].name).toBe('Charlie');
	});

	test('should sort rows by column descending', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [
				{ name: 'Charlie', age: 35 },
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'age:desc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data[0].age).toBe(35);
		expect(response.body.data[1].age).toBe(30);
		expect(response.body.data[2].age).toBe(25);
	});

	test('should reject invalid sort format', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'invalid_format' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Invalid sort format, expected <columnName>:<asc/desc>');
	});

	test('should reject invalid sort direction', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'name:invalid' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Invalid sort direction');
	});

	test('should paginate with skip and take', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'position', type: 'number' },
			],
			data: [
				{ name: 'Alice', position: 1 },
				{ name: 'Bob', position: 2 },
				{ name: 'Charlie', position: 3 },
				{ name: 'David', position: 4 },
				{ name: 'Eve', position: 5 },
			],
		});

		// Test skip
		const response1 = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ skip: 2, sortBy: 'position:asc' });

		expect(response1.statusCode).toBe(200);
		expect(response1.body.data).toHaveLength(3);
		expect(response1.body.data[0].name).toBe('Charlie');

		// Test take
		const response2 = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ take: 2, sortBy: 'position:asc' });

		expect(response2.statusCode).toBe(200);
		expect(response2.body.data).toHaveLength(2);
		expect(response2.body.data[0].name).toBe('Alice');
		expect(response2.body.data[1].name).toBe('Bob');

		// Test skip + take
		const response3 = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ skip: 1, take: 2, sortBy: 'position:asc' });

		expect(response3.statusCode).toBe(200);
		expect(response3.body.data).toHaveLength(2);
		expect(response3.body.data[0].name).toBe('Bob');
		expect(response3.body.data[1].name).toBe('Charlie');
	});

	test('should search across columns', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'email', type: 'string' },
			],
			data: [
				{ name: 'Alice', email: 'alice@example.com' },
				{ name: 'Bob', email: 'bob@test.com' },
				{ name: 'Charlie', email: 'charlie@example.com' },
			],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ search: 'example' });

		expect(response.statusCode).toBe(200);
		expect(response.body.count).toBe(2);
		expect(response.body.data.map((r: any) => r.name).sort()).toEqual(['Alice', 'Charlie']);
	});
});

describe('POST /data-tables/:dataTableId/rows', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/data-tables/123/rows', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/data-tables/123/rows', 'abcXYZ'),
	);

	test('should insert rows with returnType count', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'email', type: 'string' },
			],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows`).send({
			data: [
				{ name: 'Alice', email: 'alice@example.com' },
				{ name: 'Bob', email: 'bob@example.com' },
			],
			returnType: 'count',
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ insertedRows: 2, success: true });
	});

	test('should insert rows with returnType id', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows`).send({
			data: [{ name: 'Alice' }, { name: 'Bob' }],
			returnType: 'id',
		});

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(2);
		// returnType 'id' returns objects with id property
		expect(response.body[0]).toHaveProperty('id');
		expect(typeof response.body[0].id).toBe('number');
		expect(response.body[1]).toHaveProperty('id');
		expect(typeof response.body[1].id).toBe('number');
	});

	test('should insert rows with returnType all', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows`).send({
			data: [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
			returnType: 'all',
		});

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(2);
		expect(response.body[0]).toHaveProperty('id');
		expect(response.body[0]).toHaveProperty('name', 'Alice');
		expect(response.body[0]).toHaveProperty('age', 30);
		expect(response.body[1]).toHaveProperty('name', 'Bob');
		expect(response.body[1]).toHaveProperty('age', 25);
	});
});

describe('PATCH /data-tables/:dataTableId/rows/update', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('patch', '/data-tables/123/rows/update', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('patch', '/data-tables/123/rows/update', 'abcXYZ'),
	);

	test('should update rows with returnData false', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'status', type: 'string' },
				{ name: 'count', type: 'number' },
			],
			data: [
				{ status: 'pending', count: 1 },
				{ status: 'pending', count: 2 },
			],
		});

		const response = await authOwnerAgent.patch(`/data-tables/${dataTable.id}/rows/update`).send({
			filter: {
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: 'pending' }],
			},
			data: { status: 'completed' },
			returnData: false,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toBe(true);
	});

	test('should update rows with returnData true', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'status', type: 'string' },
				{ name: 'value', type: 'number' },
			],
			data: [
				{ status: 'pending', value: 10 },
				{ status: 'pending', value: 20 },
				{ status: 'active', value: 30 },
			],
		});

		const response = await authOwnerAgent.patch(`/data-tables/${dataTable.id}/rows/update`).send({
			filter: {
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: 'pending' }],
			},
			data: { status: 'completed' },
			returnData: true,
		});

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(2);
		expect(response.body[0]).toHaveProperty('status', 'completed');
		expect(response.body[1]).toHaveProperty('status', 'completed');
	});

	test('should preview update with dryRun true', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'status', type: 'string' },
				{ name: 'count', type: 'number' },
			],
			data: [
				{ status: 'pending', count: 1 },
				{ status: 'pending', count: 2 },
			],
		});

		const response = await authOwnerAgent.patch(`/data-tables/${dataTable.id}/rows/update`).send({
			filter: {
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: 'pending' }],
			},
			data: { status: 'completed' },
			dryRun: true,
			returnData: true,
		});

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		// dryRun returns both before and after states for each row
		expect(response.body).toHaveLength(4);
		expect(response.body.filter((r: any) => r.dryRunState === 'before')).toHaveLength(2);
		expect(response.body.filter((r: any) => r.dryRunState === 'after')).toHaveLength(2);

		// Verify data was not actually updated
		const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/rows`);
		expect(getResponse.body.data.every((row: any) => row.status === 'pending')).toBe(true);
	});
});

describe('POST /data-tables/:dataTableId/rows/upsert', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('post', '/data-tables/123/rows/upsert', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/data-tables/123/rows/upsert', 'abcXYZ'),
	);

	test('should upsert row with returnData false', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'name', type: 'string' },
			],
			data: [{ email: 'test@example.com', name: 'Test User' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows/upsert`).send({
			filter: {
				type: 'and',
				filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
			},
			data: { email: 'test@example.com', name: 'Updated User' },
			returnData: false,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toBe(true);
	});

	test('should upsert row with returnData true', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'status', type: 'string' },
			],
			data: [{ email: 'existing@example.com', status: 'old' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows/upsert`).send({
			filter: {
				type: 'and',
				filters: [{ columnName: 'email', condition: 'eq', value: 'existing@example.com' }],
			},
			data: { email: 'existing@example.com', status: 'updated' },
			returnData: true,
		});

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(1);
		expect(response.body[0]).toHaveProperty('email', 'existing@example.com');
		expect(response.body[0]).toHaveProperty('status', 'updated');
	});

	test('should preview upsert with dryRun true', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'count', type: 'number' },
			],
			data: [{ email: 'test@example.com', count: 5 }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows/upsert`).send({
			filter: {
				type: 'and',
				filters: [{ columnName: 'email', condition: 'eq', value: 'test@example.com' }],
			},
			data: { email: 'test@example.com', count: 10 },
			dryRun: true,
			returnData: true,
		});

		expect(response.statusCode).toBe(200);
		// dryRun returns both before and after states
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(2);
		expect(response.body[0]).toHaveProperty('dryRunState', 'before');
		expect(response.body[0]).toHaveProperty('count', 5);
		expect(response.body[1]).toHaveProperty('dryRunState', 'after');
		expect(response.body[1]).toHaveProperty('count', 10);

		// Verify data was not actually updated
		const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/rows`);
		expect(getResponse.body.data[0].count).toBe(5);
	});
});

describe('DELETE /data-tables/:dataTableId/rows/delete', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('delete', '/data-tables/123/rows/delete', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('delete', '/data-tables/123/rows/delete', 'abcXYZ'),
	);

	test('should delete rows with returnData false', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'status', type: 'string' }],
			data: [{ status: 'old' }, { status: 'active' }],
		});

		const filter = JSON.stringify({
			type: 'and',
			filters: [{ columnName: 'status', condition: 'eq', value: 'old' }],
		});

		const response = await authOwnerAgent
			.delete(`/data-tables/${dataTable.id}/rows/delete`)
			.query({ filter, returnData: 'false' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toBe(true);
	});

	test('should delete rows with returnData true', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'status', type: 'string' },
				{ name: 'value', type: 'number' },
			],
			data: [
				{ status: 'archived', value: 1 },
				{ status: 'archived', value: 2 },
				{ status: 'active', value: 3 },
			],
		});

		const filter = JSON.stringify({
			type: 'and',
			filters: [{ columnName: 'status', condition: 'eq', value: 'archived' }],
		});

		const response = await authOwnerAgent
			.delete(`/data-tables/${dataTable.id}/rows/delete`)
			.query({ filter, returnData: 'true' });

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(2);
		expect(response.body[0]).toHaveProperty('status', 'archived');
		expect(response.body[1]).toHaveProperty('status', 'archived');
	});

	test('should preview delete with dryRun true', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'status', type: 'string' },
				{ name: 'id_num', type: 'number' },
			],
			data: [
				{ status: 'temp', id_num: 1 },
				{ status: 'temp', id_num: 2 },
				{ status: 'permanent', id_num: 3 },
			],
		});

		const filter = JSON.stringify({
			type: 'and',
			filters: [{ columnName: 'status', condition: 'eq', value: 'temp' }],
		});

		const response = await authOwnerAgent
			.delete(`/data-tables/${dataTable.id}/rows/delete`)
			.query({ filter, dryRun: 'true', returnData: 'true' });

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		// dryRun returns both before and after states for each row
		expect(response.body).toHaveLength(4);
		expect(response.body.filter((r: any) => r.dryRunState === 'before')).toHaveLength(2);
		expect(response.body.filter((r: any) => r.dryRunState === 'after')).toHaveLength(2);

		// Verify data was not actually deleted
		const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/rows`);
		expect(getResponse.body.count).toBe(3);
	});

	test('should return 400 when filter is missing', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'data', type: 'string' }],
		});

		const response = await authOwnerAgent.delete(`/data-tables/${dataTable.id}/rows/delete`);

		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty(
			'message',
			"request/query must have required property 'filter'",
		);
	});
});

describe('Filter Parameter Validation', () => {
	let dataTable: DataTable;

	beforeEach(async () => {
		dataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'status', type: 'string' },
				{ name: 'score', type: 'number' },
				{ name: 'active', type: 'boolean' },
			],
			data: [
				{ name: 'Alice', status: 'active', score: 95, active: true },
				{ name: 'Bob', status: 'inactive', score: 75, active: false },
				{ name: 'Charlie', status: 'active', score: 85, active: true },
				{ name: 'Diana', status: 'pending', score: 90, active: false },
				{ name: 'Eve', status: 'active', score: 80, active: true },
			],
		});
	});

	describe('GET with filter conditions', () => {
		test('should filter with eq (equals) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: 'active' }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(3);
			expect(response.body.data.every((row: any) => row.status === 'active')).toBe(true);
		});

		test('should filter with neq (not equals) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'neq', value: 'active' }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2);
			expect(response.body.data.every((row: any) => row.status !== 'active')).toBe(true);
		});

		test('should filter with gt (greater than) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'score', condition: 'gt', value: 85 }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2);
			expect(response.body.data.every((row: any) => row.score > 85)).toBe(true);
		});

		test('should filter with gte (greater than or equal) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'score', condition: 'gte', value: 85 }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(3);
			expect(response.body.data.every((row: any) => row.score >= 85)).toBe(true);
		});

		test('should filter with lt (less than) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'score', condition: 'lt', value: 85 }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2);
			expect(response.body.data.every((row: any) => row.score < 85)).toBe(true);
		});

		test('should filter with lte (less than or equal) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'score', condition: 'lte', value: 85 }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(3);
			expect(response.body.data.every((row: any) => row.score <= 85)).toBe(true);
		});

		test('should filter with like condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'name', condition: 'like', value: '%li%' }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2); // Alice and Charlie
		});

		test('should filter with ilike (case-insensitive like) condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'name', condition: 'ilike', value: '%ALI%' }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			// Note: SQLite LIKE is case-insensitive by default, so ilike behaves the same
			expect(response.body.count).toBe(1); // Only Alice contains 'ALI'
		});
	});

	describe('Filter with AND/OR types', () => {
		test('should filter with type "and" - multiple conditions must all match', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [
					{ columnName: 'status', condition: 'eq', value: 'active' },
					{ columnName: 'score', condition: 'gte', value: 85 },
				],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2); // Alice (95) and Charlie (85)
			expect(
				response.body.data.every((row: any) => row.status === 'active' && row.score >= 85),
			).toBe(true);
		});

		test('should filter with type "or" - any condition can match', async () => {
			const filter = JSON.stringify({
				type: 'or',
				filters: [
					{ columnName: 'status', condition: 'eq', value: 'pending' },
					{ columnName: 'score', condition: 'gte', value: 95 },
				],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2); // Diana (pending) and Alice (score 95)
		});
	});

	describe('Filter with boolean values', () => {
		test('should filter boolean column with true value', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'active', condition: 'eq', value: true }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(3);
			expect(response.body.data.every((row: any) => row.active === true)).toBe(true);
		});

		test('should filter boolean column with false value', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'active', condition: 'eq', value: false }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(2);
			expect(response.body.data.every((row: any) => row.active === false)).toBe(true);
		});
	});

	describe('Filter with null values', () => {
		beforeEach(async () => {
			// Add a row with null value
			await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows`).send({
				data: [{ name: 'Frank', status: null, score: 70, active: true }],
				returnType: 'count',
			});
		});

		test('should filter for null values', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'eq', value: null }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(1);
			expect(response.body.data[0].status).toBeNull();
		});

		test('should filter for non-null values', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'neq', value: null }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(200);
			expect(response.body.count).toBe(5);
			expect(response.body.data.every((row: any) => row.status !== null)).toBe(true);
		});
	});

	describe('Invalid filter formats', () => {
		test('should return 400 for invalid JSON filter', async () => {
			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter: '{invalid json}' });

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for filter with invalid condition', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'status', condition: 'invalid', value: 'active' }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for filter with missing columnName', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ condition: 'eq', value: 'active' }],
			});

			const response = await authOwnerAgent
				.get(`/data-tables/${dataTable.id}/rows`)
				.query({ filter });

			expect(response.statusCode).toBe(400);
		});
	});

	describe('Filter in UPDATE operations', () => {
		test('should update only rows matching filter', async () => {
			const response = await authOwnerAgent.patch(`/data-tables/${dataTable.id}/rows/update`).send({
				filter: {
					type: 'and',
					filters: [
						{ columnName: 'status', condition: 'eq', value: 'active' },
						{ columnName: 'score', condition: 'lt', value: 90 },
					],
				},
				data: { status: 'promoted' },
				returnData: false,
			});

			expect(response.statusCode).toBe(200);

			// Verify the update
			const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/rows`).query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'status', condition: 'eq', value: 'promoted' }],
				}),
			});

			expect(getResponse.body.count).toBe(2); // Charlie (85) and Eve (80)
		});
	});

	describe('Filter in DELETE operations', () => {
		test('should delete only rows matching filter', async () => {
			const filter = JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'score', condition: 'lt', value: 80 }],
			});

			const response = await authOwnerAgent
				.delete(`/data-tables/${dataTable.id}/rows/delete`)
				.query({ filter, returnData: 'false' });

			expect(response.statusCode).toBe(200);

			// Verify remaining rows
			const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/rows`);

			expect(getResponse.body.count).toBe(4); // Bob (75) should be deleted
		});
	});
});
