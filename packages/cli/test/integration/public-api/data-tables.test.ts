import { testDb, createTeamProject, linkUserToProject } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import type { DataTable } from '@/modules/data-table/data-table.entity';

import { createDataTable } from '../shared/db/data-tables';
import { createOwnerWithApiKey, createMemberWithApiKey } from '../shared/db/users';
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
	await testDb.truncate(['ProjectRelation', 'Project']);

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
	(method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, apiKey: string | null) =>
	async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

describe('GET /data-tables', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/data-tables', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/data-tables', 'abcXYZ'));

	test('should list data tables', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'table1',
			columns: [{ name: 'name', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'table2',
			columns: [{ name: 'age', type: 'number' }],
		});

		const response = await authOwnerAgent.get('/data-tables');

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('data');
		expect(response.body).toHaveProperty('nextCursor');
		expect(response.body.data).toHaveLength(2);
		expect(response.body.nextCursor).toBeNull();
		expect(response.body.data[0]).toHaveProperty('id');
		expect(response.body.data[0]).toHaveProperty('name');
		expect(response.body.data[0]).toHaveProperty('columns');
	});

	test('should paginate data tables', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'table1',
			columns: [{ name: 'col1', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'table2',
			columns: [{ name: 'col2', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'table3',
			columns: [{ name: 'col3', type: 'string' }],
		});

		const response1 = await authOwnerAgent.get('/data-tables').query({ limit: 2 });

		expect(response1.statusCode).toBe(200);
		expect(response1.body.data).toHaveLength(2);
		expect(response1.body.nextCursor).toBeTruthy();

		const response2 = await authOwnerAgent
			.get('/data-tables')
			.query({ cursor: response1.body.nextCursor });

		expect(response2.statusCode).toBe(200);
		expect(response2.body.data).toHaveLength(1);
		expect(response2.body.nextCursor).toBeNull();
	});

	test('should sort data tables by name ascending', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'zebra',
			columns: [{ name: 'col1', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'apple',
			columns: [{ name: 'col2', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'mango',
			columns: [{ name: 'col3', type: 'string' }],
		});

		const response = await authOwnerAgent.get('/data-tables').query({ sortBy: 'name:asc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data[0].name).toBe('apple');
		expect(response.body.data[1].name).toBe('mango');
		expect(response.body.data[2].name).toBe('zebra');
	});

	test('should sort data tables by createdAt descending', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'first',
			columns: [{ name: 'col1', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'second',
			columns: [{ name: 'col2', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'third',
			columns: [{ name: 'col3', type: 'string' }],
		});

		const response = await authOwnerAgent.get('/data-tables').query({ sortBy: 'createdAt:desc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		const createdAtTimes = response.body.data.map((table: any) =>
			new Date(table.createdAt).getTime(),
		);
		expect(createdAtTimes).toEqual([...createdAtTimes].sort((a, b) => b - a));
	});

	test('should reject invalid sortBy option (sizeBytes)', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'table1',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.get('/data-tables').query({ sortBy: 'sizeBytes:asc' });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('sortBy must be one of');
	});

	test('should use default limit of 100', async () => {
		for (let i = 1; i <= 101; i++) {
			await createDataTable(ownerPersonalProject, {
				name: `table${i}`,
				columns: [{ name: 'col', type: 'string' }],
			});
		}

		const response = await authOwnerAgent.get('/data-tables');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(100);
		expect(response.body.nextCursor).toBeTruthy();
	});

	test('should list data tables from personal project and accessible team projects', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject();
		await linkUserToProject(owner, teamProject, 'project:admin');

		await createDataTable(ownerPersonalProject, {
			name: 'personal-table',
			columns: [{ name: 'col1', type: 'string' }],
		});
		await createDataTable(teamProject, {
			name: 'team-table',
			columns: [{ name: 'col2', type: 'string' }],
		});

		const response = await authOwnerAgent.get('/data-tables');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2);

		const tableNames = response.body.data.map((table: any) => table.name);
		expect(tableNames).toContain('personal-table');
		expect(tableNames).toContain('team-table');
	});

	test('should not list data tables from team projects user is not member of', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject = await createTeamProject();
		await linkUserToProject(owner, teamProject, 'project:admin');

		await createDataTable(memberPersonalProject, {
			name: 'member-personal-table',
			columns: [{ name: 'col1', type: 'string' }],
		});
		await createDataTable(teamProject, {
			name: 'team-table-no-access',
			columns: [{ name: 'col2', type: 'string' }],
		});

		const memberResponse = await authMemberAgent.get('/data-tables');

		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.data).toHaveLength(1);
		expect(memberResponse.body.data[0].name).toBe('member-personal-table');

		const ownerResponse = await authOwnerAgent.get('/data-tables');

		expect(ownerResponse.statusCode).toBe(200);
		expect(ownerResponse.body.data).toHaveLength(2);
		const tableNames = ownerResponse.body.data.map((table: any) => table.name);
		expect(tableNames).toContain('member-personal-table');
		expect(tableNames).toContain('team-table-no-access');
	});

	test('should list data tables from multiple team projects user has access to', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');

		const teamProject1 = await createTeamProject('Team A');
		const teamProject2 = await createTeamProject('Team B');
		const teamProject3 = await createTeamProject('Team C');

		await linkUserToProject(member, teamProject1, 'project:admin');
		await linkUserToProject(member, teamProject2, 'project:viewer');

		await createDataTable(memberPersonalProject, {
			name: 'personal-table',
			columns: [{ name: 'col', type: 'string' }],
		});
		await createDataTable(teamProject1, {
			name: 'team-a-table',
			columns: [{ name: 'col', type: 'string' }],
		});
		await createDataTable(teamProject2, {
			name: 'team-b-table',
			columns: [{ name: 'col', type: 'string' }],
		});
		await createDataTable(teamProject3, {
			name: 'team-c-table-no-explicit-access',
			columns: [{ name: 'col', type: 'string' }],
		});

		const memberResponse = await authMemberAgent.get('/data-tables');

		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.data).toHaveLength(3);

		const memberTableNames = memberResponse.body.data.map((table: any) => table.name);
		expect(memberTableNames).toContain('personal-table');
		expect(memberTableNames).toContain('team-a-table');
		expect(memberTableNames).toContain('team-b-table');
		expect(memberTableNames).not.toContain('team-c-table-no-explicit-access');

		const ownerResponse = await authOwnerAgent.get('/data-tables');

		expect(ownerResponse.statusCode).toBe(200);
		expect(ownerResponse.body.data).toHaveLength(4);

		const ownerTableNames = ownerResponse.body.data.map((table: any) => table.name);
		expect(ownerTableNames).toContain('personal-table');
		expect(ownerTableNames).toContain('team-a-table');
		expect(ownerTableNames).toContain('team-b-table');
		expect(ownerTableNames).toContain('team-c-table-no-explicit-access');
	});

	test('should check if global owners can see data tables in other users personal projects', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'owner-personal-table',
			columns: [{ name: 'col', type: 'string' }],
		});
		await createDataTable(memberPersonalProject, {
			name: 'member-personal-table',
			columns: [{ name: 'col', type: 'string' }],
		});

		const ownerResponse = await authOwnerAgent.get('/data-tables');

		expect(ownerResponse.statusCode).toBe(200);
		expect(ownerResponse.body.data).toHaveLength(2);

		const ownerTableNames = ownerResponse.body.data.map((table: any) => table.name);
		expect(ownerTableNames).toContain('owner-personal-table');
		expect(ownerTableNames).toContain('member-personal-table');

		const memberResponse = await authMemberAgent.get('/data-tables');

		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.data).toHaveLength(1);
		expect(memberResponse.body.data[0].name).toBe('member-personal-table');
	});
});

describe('POST /data-tables', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/data-tables', null));

	test('should fail due to invalid API Key', testWithAPIKey('post', '/data-tables', 'abcXYZ'));

	test('should create a data table', async () => {
		const response = await authOwnerAgent.post('/data-tables').send({
			name: 'my-table',
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'age', type: 'number' },
			],
		});

		expect(response.statusCode).toBe(201);
		expect(response.body).toHaveProperty('id');
		expect(response.body).toHaveProperty('name', 'my-table');
		expect(response.body).toHaveProperty('columns');
		expect(response.body.columns).toHaveLength(2);
		expect(response.body).toHaveProperty('projectId', ownerPersonalProject.id);
	});

	test('should fail with duplicate name', async () => {
		await createDataTable(ownerPersonalProject, {
			name: 'existing-table',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.post('/data-tables').send({
			name: 'existing-table',
			columns: [{ name: 'col2', type: 'string' }],
		});

		expect(response.statusCode).toBe(409);
		expect(response.body).toHaveProperty('message');
	});

	test('should fail with invalid data', async () => {
		const response = await authOwnerAgent.post('/data-tables').send({
			name: '',
			columns: [],
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty('message');
	});

	test('should reject unsupported column type (json)', async () => {
		const response = await authOwnerAgent.post('/data-tables').send({
			name: 'test-table',
			columns: [{ name: 'data', type: 'json' }],
		});

		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty('message');
	});
});

describe('GET /data-tables/:dataTableId', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/data-tables/123', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/data-tables/123', 'abcXYZ'));

	test('should return 404 for non-existing data table', async () => {
		const nonExistentId = 'abcd1234efgh5678';
		const response = await authOwnerAgent.get(`/data-tables/${nonExistentId}`);

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${nonExistentId}'`,
		);
	});

	test('should get a data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'test-table',
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
		});

		const response = await authOwnerAgent.get(`/data-tables/${dataTable.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', dataTable.id);
		expect(response.body).toHaveProperty('name', 'test-table');
		expect(response.body).toHaveProperty('columns');
		expect(response.body.columns).toHaveLength(2);
	});

	test('should return 403 when user does not have access to the data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'owner-table',
			columns: [{ name: 'name', type: 'string' }],
		});

		const response = await authMemberAgent.get(`/data-tables/${dataTable.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body).toHaveProperty('message');
	});

	test('should allow access to own data table', async () => {
		const dataTable = await createDataTable(memberPersonalProject, {
			name: 'member-table',
			columns: [{ name: 'name', type: 'string' }],
		});

		const response = await authMemberAgent.get(`/data-tables/${dataTable.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', dataTable.id);
		expect(response.body).toHaveProperty('name', 'member-table');
	});
});

describe('PATCH /data-tables/:dataTableId', () => {
	test('should fail due to missing API Key', testWithAPIKey('patch', '/data-tables/123', null));

	test('should fail due to invalid API Key', testWithAPIKey('patch', '/data-tables/123', 'abcXYZ'));

	test('should return 404 for non-existing data table', async () => {
		const nonExistentId = 'abcd1234efgh5678';
		const response = await authOwnerAgent.patch(`/data-tables/${nonExistentId}`).send({
			name: 'new-name',
		});

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${nonExistentId}'`,
		);
	});

	test('should update a data table name', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'old-name',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.patch(`/data-tables/${dataTable.id}`).send({
			name: 'new-name',
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', dataTable.id);
		expect(response.body).toHaveProperty('name', 'new-name');
	});

	test('should fail with duplicate name', async () => {
		const dataTable1 = await createDataTable(ownerPersonalProject, {
			name: 'table1',
			columns: [{ name: 'col1', type: 'string' }],
		});
		await createDataTable(ownerPersonalProject, {
			name: 'table2',
			columns: [{ name: 'col2', type: 'string' }],
		});

		const response = await authOwnerAgent.patch(`/data-tables/${dataTable1.id}`).send({
			name: 'table2',
		});

		expect(response.statusCode).toBe(409);
		expect(response.body).toHaveProperty('message');
	});

	test('should return 403 when user does not have access to update the data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'owner-table',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authMemberAgent.patch(`/data-tables/${dataTable.id}`).send({
			name: 'hacked-name',
		});

		expect(response.statusCode).toBe(403);
		expect(response.body).toHaveProperty('message');
	});
});

describe('DELETE /data-tables/:dataTableId', () => {
	test('should fail due to missing API Key', testWithAPIKey('delete', '/data-tables/123', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('delete', '/data-tables/123', 'abcXYZ'),
	);

	test('should return 404 for non-existing data table', async () => {
		const nonExistentId = 'abcd1234efgh5678';
		const response = await authOwnerAgent.delete(`/data-tables/${nonExistentId}`);

		expect(response.statusCode).toBe(404);
		expect(response.body).toHaveProperty(
			'message',
			`Could not find the data table: '${nonExistentId}'`,
		);
	});

	test('should delete a data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'table-to-delete',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.delete(`/data-tables/${dataTable.id}`);

		expect(response.statusCode).toBe(204);
		expect(response.body).toEqual({});

		// Verify it's deleted
		const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}`);
		expect(getResponse.statusCode).toBe(404);
	});

	test('should return 403 when user does not have access to delete the data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'owner-table',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authMemberAgent.delete(`/data-tables/${dataTable.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body).toHaveProperty('message');

		// Verify it's not actually deleted
		const getResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}`);
		expect(getResponse.statusCode).toBe(200);
	});
});

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
		expect(response.body.nextCursor).toBeNull();

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

	test('should sort by system column (id)', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'id:asc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		// IDs are auto-incrementing, so ascending order means first inserted comes first
		expect(response.body.data[0].name).toBe('Charlie');
		expect(response.body.data[1].name).toBe('Alice');
		expect(response.body.data[2].name).toBe('Bob');
	});

	test('should sort by system column (createdAt)', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'createdAt:desc' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.data.every((row: any) => row.createdAt)).toBe(true);

		const createdAtTimes = response.body.data.map((row: any) => new Date(row.createdAt).getTime());
		expect(createdAtTimes).toEqual([...createdAtTimes].sort((a, b) => b - a));
	});

	test('should reject column names with invalid characters', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const response = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ sortBy: 'user-name:asc' }); // hyphen not allowed

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('alphabetical characters');
	});

	test('should paginate with cursor and limit', async () => {
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

		// Test first page with limit
		const response1 = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ limit: 2, sortBy: 'position:asc' });

		expect(response1.statusCode).toBe(200);
		expect(response1.body.data).toHaveLength(2);
		expect(response1.body.data[0].name).toBe('Alice');
		expect(response1.body.data[1].name).toBe('Bob');
		expect(response1.body.nextCursor).toBeTruthy();

		// Test second page using cursor
		const response2 = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ cursor: response1.body.nextCursor, sortBy: 'position:asc' });

		expect(response2.statusCode).toBe(200);
		expect(response2.body.data).toHaveLength(2);
		expect(response2.body.data[0].name).toBe('Charlie');
		expect(response2.body.data[1].name).toBe('David');
		expect(response2.body.nextCursor).toBeTruthy();

		// Test third page using cursor
		const response3 = await authOwnerAgent
			.get(`/data-tables/${dataTable.id}/rows`)
			.query({ cursor: response2.body.nextCursor, sortBy: 'position:asc' });

		expect(response3.statusCode).toBe(200);
		expect(response3.body.data).toHaveLength(1);
		expect(response3.body.data[0].name).toBe('Eve');
		expect(response3.body.nextCursor).toBeNull();
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
		expect(response.body.data.length).toBe(2);
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

	test('should use default returnType when not provided', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			columns: [{ name: 'name', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/rows`).send({
			data: [{ name: 'Alice' }],
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ insertedRows: 1, success: true });
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
		expect(getResponse.body.data.length).toBe(3);
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
			expect(response.body.data.length).toBe(3);
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
			expect(response.body.data.length).toBe(2);
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
			expect(response.body.data.length).toBe(2);
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
			expect(response.body.data.length).toBe(3);
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
			expect(response.body.data.length).toBe(2);
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
			expect(response.body.data.length).toBe(3);
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
			expect(response.body.data.length).toBe(2); // Alice and Charlie
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
			expect(response.body.data.length).toBe(1); // Only Alice contains 'ALI'
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
			expect(response.body.data.length).toBe(2); // Alice (95) and Charlie (85)
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
			expect(response.body.data.length).toBe(2); // Diana (pending) and Alice (score 95)
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
			expect(response.body.data.length).toBe(3);
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
			expect(response.body.data.length).toBe(2);
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
			expect(response.body.data.length).toBe(1);
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
			expect(response.body.data.length).toBe(5);
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

			expect(getResponse.body.data.length).toBe(2); // Charlie (85) and Eve (80)
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

			expect(getResponse.body.data.length).toBe(4); // Bob (75) should be deleted
		});
	});
});

describe('POST /data-tables with projectId', () => {
	beforeEach(() => {
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');
	});

	test('should create a table in the specified team project when user is a member', async () => {
		const teamProject = await createTeamProject('Team Create');
		await linkUserToProject(member, teamProject, 'project:editor');

		const response = await authMemberAgent.post('/data-tables').send({
			name: 'team-table',
			columns: [{ name: 'col1', type: 'string' }],
			projectId: teamProject.id,
		});

		expect(response.statusCode).toBe(201);
		expect(response.body).toHaveProperty('id');
		expect(response.body).toHaveProperty('name', 'team-table');
		expect(response.body).toHaveProperty('projectId', teamProject.id);
		expect(response.body).not.toHaveProperty('project');
	});

	test('should return 403 when user is not a member of the specified project', async () => {
		const teamProject = await createTeamProject('Team No Access');
		// member is NOT added to teamProject

		const response = await authMemberAgent.post('/data-tables').send({
			name: 'unauthorized-table',
			columns: [{ name: 'col1', type: 'string' }],
			projectId: teamProject.id,
		});

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /data-tables with projectId filter', () => {
	beforeEach(() => {
		testServer.license.setQuota('quota:maxTeamProjects', -1);
		testServer.license.enable('feat:projectRole:admin');
	});

	test('should return only tables from the specified team project when user is a member', async () => {
		const teamProject = await createTeamProject('Team Filter');
		await linkUserToProject(member, teamProject, 'project:viewer');

		await createDataTable(memberPersonalProject, {
			name: 'personal-table',
			columns: [{ name: 'col', type: 'string' }],
		});
		await createDataTable(teamProject, {
			name: 'team-table',
			columns: [{ name: 'col', type: 'string' }],
		});

		const filter = JSON.stringify({ projectId: teamProject.id });
		const response = await authMemberAgent.get('/data-tables').query({ filter });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('team-table');
	});

	test('should return empty results when filtering by a project the user is not a member of', async () => {
		const teamProject = await createTeamProject('Team No Filter Access');
		// member is NOT added to teamProject

		const filter = JSON.stringify({ projectId: teamProject.id });
		const response = await authMemberAgent.get('/data-tables').query({ filter });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});

	test('should allow filtering by the user personal project id', async () => {
		await createDataTable(memberPersonalProject, {
			name: 'personal-only-table',
			columns: [{ name: 'col', type: 'string' }],
		});

		const filter = JSON.stringify({ projectId: memberPersonalProject.id });
		const response = await authMemberAgent.get('/data-tables').query({ filter });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('personal-only-table');
	});
});

describe('GET /data-tables/:dataTableId/columns', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('get', '/data-tables/123/columns', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('get', '/data-tables/123/columns', 'abcXYZ'),
	);

	test('should list columns for a data table', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'columns-test',
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
			],
		});

		const response = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body).toHaveLength(3);
		expect(response.body[0]).toHaveProperty('id');
		expect(response.body[0]).toHaveProperty('name');
		expect(response.body[0]).toHaveProperty('type');
		expect(response.body[0]).toHaveProperty('index');
		expect(response.body[0]).toHaveProperty('dataTableId', dataTable.id);
	});

	test('should return 404 for non-existing data table', async () => {
		const nonExistentId = 'abcd1234efgh5678';
		const response = await authOwnerAgent.get(`/data-tables/${nonExistentId}/columns`);

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user does not have access', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'owner-columns-table',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authMemberAgent.get(`/data-tables/${dataTable.id}/columns`);

		expect(response.statusCode).toBe(403);
	});
});

describe('POST /data-tables/:dataTableId/columns', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('post', '/data-tables/123/columns', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/data-tables/123/columns', 'abcXYZ'),
	);

	test('should add a column', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'add-column-test',
			columns: [{ name: 'name', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/columns`).send({
			name: 'email',
			type: 'string',
		});

		expect(response.statusCode).toBe(201);
		expect(response.body).toHaveProperty('id');
		expect(response.body).toHaveProperty('name', 'email');
		expect(response.body).toHaveProperty('type', 'string');
		expect(response.body).toHaveProperty('index', 1);

		const listResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		expect(listResponse.body).toHaveLength(2);
	});

	test('should fail with invalid column type', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'invalid-type-test',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/columns`).send({
			name: 'data',
			type: 'json',
		});

		expect(response.statusCode).toBe(400);
	});

	test('should fail with duplicate column name', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'dup-column-test',
			columns: [{ name: 'existing', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/columns`).send({
			name: 'existing',
			type: 'number',
		});

		expect(response.statusCode).toBe(409);
	});

	test('should fail with system column name', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'system-col-test',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.post(`/data-tables/${dataTable.id}/columns`).send({
			name: 'createdAt',
			type: 'date',
		});

		expect(response.statusCode).toBe(409);
	});

	test('should return 403 when user does not have access', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'no-access-add-col',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authMemberAgent.post(`/data-tables/${dataTable.id}/columns`).send({
			name: 'newcol',
			type: 'string',
		});

		expect(response.statusCode).toBe(403);
	});
});

describe('DELETE /data-tables/:dataTableId/columns/:columnId', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('delete', '/data-tables/123/columns/456', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('delete', '/data-tables/123/columns/456', 'abcXYZ'),
	);

	test('should delete a column', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'delete-col-test',
			columns: [
				{ name: 'keep', type: 'string' },
				{ name: 'remove', type: 'string' },
			],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const columnId = columnsResponse.body.find((c: any) => c.name === 'remove').id;

		const response = await authOwnerAgent.delete(
			`/data-tables/${dataTable.id}/columns/${columnId}`,
		);

		expect(response.statusCode).toBe(204);
		expect(response.body).toEqual({});

		const afterResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		expect(afterResponse.body).toHaveLength(1);
		expect(afterResponse.body[0].name).toBe('keep');
	});

	test('should return 404 for non-existing column', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'delete-missing-col',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const response = await authOwnerAgent.delete(
			`/data-tables/${dataTable.id}/columns/AAAAAAAAAAAAAAAA`,
		);

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user does not have access', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'no-access-delete-col',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const columnId = columnsResponse.body[0].id;

		const response = await authMemberAgent.delete(
			`/data-tables/${dataTable.id}/columns/${columnId}`,
		);

		expect(response.statusCode).toBe(403);

		const afterResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		expect(afterResponse.body).toHaveLength(1);
	});
});

describe('PATCH /data-tables/:dataTableId/columns/:columnId', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('patch', '/data-tables/123/columns/456', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('patch', '/data-tables/123/columns/456', 'abcXYZ'),
	);

	test('should rename a column', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'rename-column-test',
			columns: [{ name: 'old_name', type: 'string' }],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const columnId = columnsResponse.body[0].id;

		const response = await authOwnerAgent
			.patch(`/data-tables/${dataTable.id}/columns/${columnId}`)
			.send({
				name: 'new_name',
			});

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', columnId);
		expect(response.body).toHaveProperty('name', 'new_name');
		expect(response.body).toHaveProperty('index', 0);
	});

	test('should move a column', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'move-column-test',
			columns: [
				{ name: 'first', type: 'string' },
				{ name: 'second', type: 'string' },
				{ name: 'third', type: 'string' },
			],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const secondColumn = columnsResponse.body.find((column: any) => column.name === 'second');

		const response = await authOwnerAgent
			.patch(`/data-tables/${dataTable.id}/columns/${secondColumn.id}`)
			.send({ index: 0 });

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', secondColumn.id);
		expect(response.body).toHaveProperty('name', 'second');
		expect(response.body).toHaveProperty('index', 0);

		const afterResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		expect(afterResponse.body[0]).toHaveProperty('id', secondColumn.id);
	});

	test('should rename and move a column in one request', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'rename-move-column-test',
			columns: [
				{ name: 'alpha', type: 'string' },
				{ name: 'beta', type: 'string' },
				{ name: 'gamma', type: 'string' },
			],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const betaColumn = columnsResponse.body.find((column: any) => column.name === 'beta');

		const response = await authOwnerAgent
			.patch(`/data-tables/${dataTable.id}/columns/${betaColumn.id}`)
			.send({ name: 'beta_renamed', index: 2 });

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('id', betaColumn.id);
		expect(response.body).toHaveProperty('name', 'beta_renamed');
		expect(response.body).toHaveProperty('index', 2);

		const afterResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		expect(afterResponse.body[2]).toHaveProperty('id', betaColumn.id);
		expect(afterResponse.body[2]).toHaveProperty('name', 'beta_renamed');
	});

	test('should fail when no update fields are provided', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'empty-patch-column-test',
			columns: [{ name: 'name', type: 'string' }],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const columnId = columnsResponse.body[0].id;

		const response = await authOwnerAgent
			.patch(`/data-tables/${dataTable.id}/columns/${columnId}`)
			.send({});

		expect(response.statusCode).toBe(400);
		expect(response.body).toHaveProperty('message');
	});

	test('should fail with duplicate column name', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'duplicate-name-column-test',
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'phone', type: 'string' },
			],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const phoneColumn = columnsResponse.body.find((column: any) => column.name === 'phone');

		const response = await authOwnerAgent
			.patch(`/data-tables/${dataTable.id}/columns/${phoneColumn.id}`)
			.send({ name: 'email' });

		expect(response.statusCode).toBe(409);
		expect(response.body).toHaveProperty('message');
	});

	test.each(DATA_TABLE_SYSTEM_COLUMNS)(
		'should fail with reserved system column name %s',
		async (systemColumnName) => {
			const dataTable = await createDataTable(ownerPersonalProject, {
				name: `reserved-name-column-test-${systemColumnName}`,
				columns: [{ name: 'custom_name', type: 'string' }],
			});

			const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
			const columnId = columnsResponse.body[0].id;

			const response = await authOwnerAgent
				.patch(`/data-tables/${dataTable.id}/columns/${columnId}`)
				.send({ name: systemColumnName });

			expect(response.statusCode).toBe(409);
			expect(response.body).toHaveProperty('message');
		},
	);

	test('should return 403 when user does not have access', async () => {
		const dataTable = await createDataTable(ownerPersonalProject, {
			name: 'no-access-update-col',
			columns: [{ name: 'col1', type: 'string' }],
		});

		const columnsResponse = await authOwnerAgent.get(`/data-tables/${dataTable.id}/columns`);
		const columnId = columnsResponse.body[0].id;

		const response = await authMemberAgent
			.patch(`/data-tables/${dataTable.id}/columns/${columnId}`)
			.send({
				name: 'updated_by_member',
			});

		expect(response.statusCode).toBe(403);
	});
});
