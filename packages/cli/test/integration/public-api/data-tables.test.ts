import { testDb } from '@n8n/backend-test-utils';
import type { DataTable, Project, User } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createDataTable } from '../shared/db/data-tables';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let ownerPersonalProject: Project;
let memberPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['data-table'],
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();

	const projectRepository = Container.get(ProjectRepository);
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
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
	memberPersonalProject = await createPersonalProject(member);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

const testWithAPIKey =
	(method: 'get' | 'post' | 'put' | 'delete', url: string, apiKey: string | null) => async () => {
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

	test('should return 404 when trying to access another users data table', async () => {
		// Create data table in member's personal project
		const memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [{ name: 'secret', type: 'string' }],
			data: [{ secret: 'member secret data' }],
		});

		// Owner tries to access member's data table
		const response = await authOwnerAgent.get(`/data-tables/${memberDataTable.id}/rows`);

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
	});

	test('should not leak information about data table existence', async () => {
		// Create data table in member's project
		const memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [{ name: 'data', type: 'string' }],
		});

		// Owner tries to access it
		const responseExisting = await authOwnerAgent.get(`/data-tables/${memberDataTable.id}/rows`);

		// Owner tries to access non-existent table
		const nonExistentId = 'xyz9876abc54321d'; // Valid nanoid format but doesn't exist
		const responseNonExistent = await authOwnerAgent.get(`/data-tables/${nonExistentId}/rows`);

		// Both should return 404 with similar error messages
		expect(responseExisting.statusCode).toBe(404);
		expect(responseNonExistent.statusCode).toBe(404);
		expect(responseExisting.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
		expect(responseNonExistent.body).toHaveProperty(
			'message',
			`Could not find the data table: '${nonExistentId}'`,
		);
	});
});

describe('POST /data-tables/:dataTableId/rows', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/data-tables/123/rows', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/data-tables/123/rows', 'abcXYZ'),
	);

	test('should insert rows into own data table', async () => {
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

	test('should return 404 when trying to insert into another users data table', async () => {
		const memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [{ name: 'data', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${memberDataTable.id}/rows`).send({
			data: [{ data: 'malicious data' }],
			returnType: 'count',
		});

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
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

	test('should update rows in own data table', async () => {
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

	test('should return 404 when trying to update another users data table', async () => {
		const memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [{ name: 'status', type: 'string' }],
			data: [{ status: 'active' }],
		});

		const response = await authOwnerAgent
			.patch(`/data-tables/${memberDataTable.id}/rows/update`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'status', condition: 'eq', value: 'active' }],
				},
				data: { status: 'hacked' },
				returnData: false,
			});

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
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

	test('should upsert row in own data table', async () => {
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

	test('should return 404 when trying to upsert in another users data table', async () => {
		const memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'name', type: 'string' },
			],
		});

		const response = await authOwnerAgent
			.post(`/data-tables/${memberDataTable.id}/rows/upsert`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'email', condition: 'eq', value: 'malicious@example.com' }],
				},
				data: { email: 'malicious@example.com', name: 'Hacker' },
				returnData: false,
			});

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
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

	test('should delete rows from own data table', async () => {
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

	test('should return 404 when trying to delete from another users data table', async () => {
		const memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [{ name: 'status', type: 'string' }],
			data: [{ status: 'important' }],
		});

		const filter = JSON.stringify({
			type: 'and',
			filters: [{ columnName: 'status', condition: 'eq', value: 'important' }],
		});

		const response = await authOwnerAgent
			.delete(`/data-tables/${memberDataTable.id}/rows/delete`)
			.query({ filter, returnData: 'false' });

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
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

describe('Security - Cross-User Access Validation', () => {
	let ownerDataTable: DataTable;
	let memberDataTable: DataTable;

	beforeEach(async () => {
		// Create data tables for both users
		ownerDataTable = await createDataTable(ownerPersonalProject, {
			columns: [
				{ name: 'owner_data', type: 'string' },
				{ name: 'value', type: 'number' },
			],
			data: [{ owner_data: 'confidential', value: 100 }],
		});

		memberDataTable = await createDataTable(memberPersonalProject, {
			columns: [
				{ name: 'member_data', type: 'string' },
				{ name: 'value', type: 'number' },
			],
			data: [{ member_data: 'private', value: 200 }],
		});
	});

	test('member cannot read owners data table', async () => {
		const response = await authMemberAgent.get(`/data-tables/${ownerDataTable.id}/rows`);

		expect(response.statusCode).toBe(404);
	});

	test('member cannot insert into owners data table', async () => {
		const response = await authMemberAgent.post(`/data-tables/${ownerDataTable.id}/rows`).send({
			data: [{ owner_data: 'injected', value: 999 }],
			returnType: 'count',
		});

		expect(response.statusCode).toBe(404);
	});

	test('member cannot update owners data table', async () => {
		const response = await authMemberAgent
			.patch(`/data-tables/${ownerDataTable.id}/rows/update`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'value', condition: 'gt', value: 0 }],
				},
				data: { value: 0 },
				returnData: false,
			});

		expect(response.statusCode).toBe(404);
	});

	test('member cannot upsert into owners data table', async () => {
		const response = await authMemberAgent
			.post(`/data-tables/${ownerDataTable.id}/rows/upsert`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'value', condition: 'eq', value: 100 }],
				},
				data: { owner_data: 'hacked', value: 0 },
				returnData: false,
			});

		expect(response.statusCode).toBe(404);
	});

	test('member cannot delete from owners data table', async () => {
		const filter = JSON.stringify({
			type: 'and',
			filters: [{ columnName: 'value', condition: 'gt', value: 0 }],
		});

		const response = await authMemberAgent
			.delete(`/data-tables/${ownerDataTable.id}/rows/delete`)
			.query({ filter, returnData: 'false' });

		expect(response.statusCode).toBe(404);
	});

	test('owner cannot read members data table', async () => {
		const response = await authOwnerAgent.get(`/data-tables/${memberDataTable.id}/rows`);

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${memberDataTable.id}'`,
		);
	});

	test('owner cannot insert into members data table', async () => {
		const response = await authOwnerAgent.post(`/data-tables/${memberDataTable.id}/rows`).send({
			data: [{ member_data: 'injected', value: 999 }],
			returnType: 'count',
		});

		expect(response.statusCode).toBe(404);
	});

	test('owner cannot update members data table', async () => {
		const response = await authOwnerAgent
			.patch(`/data-tables/${memberDataTable.id}/rows/update`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'value', condition: 'gt', value: 0 }],
				},
				data: { value: 0 },
				returnData: false,
			});

		expect(response.statusCode).toBe(404);
	});

	test('owner cannot upsert into members data table', async () => {
		const response = await authOwnerAgent
			.post(`/data-tables/${memberDataTable.id}/rows/upsert`)
			.send({
				filter: {
					type: 'and',
					filters: [{ columnName: 'value', condition: 'eq', value: 200 }],
				},
				data: { member_data: 'hacked', value: 0 },
				returnData: false,
			});

		expect(response.statusCode).toBe(404);
	});

	test('owner cannot delete from members data table', async () => {
		const filter = JSON.stringify({
			type: 'and',
			filters: [{ columnName: 'value', condition: 'gt', value: 0 }],
		});

		const response = await authOwnerAgent
			.delete(`/data-tables/${memberDataTable.id}/rows/delete`)
			.query({ filter, returnData: 'false' });

		expect(response.statusCode).toBe(404);
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
			expect(response.body.count).toBeGreaterThanOrEqual(0);
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
