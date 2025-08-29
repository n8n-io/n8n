import type { DataStore } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { DateTime } from 'luxon';

import { createDataStore } from '@test-integration/db/data-stores';
import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let member: User;
let admin: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAdminAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['data-table'],
	modules: ['data-table'],
});

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn', 'Project', 'ProjectRelation']);

	owner = await createOwner();
	member = await createMember();
	admin = await createAdmin();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAdminAgent = testServer.authAgentFor(admin);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GET /data-tables-global', () => {
	test('should not list data stores when no data stores exist', async () => {
		const response = await authOwnerAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should not list data stores from projects member has no access to', async () => {
		const project = await createTeamProject('test project', owner);
		await createDataStore(project, { name: 'Test Data Store' });

		const response = await authMemberAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should not list data stores from projects admin has no access to', async () => {
		const project = await createTeamProject('test project', owner);
		await createDataStore(project, { name: 'Test Data Store' });

		const response = await authAdminAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test("should not list data stores from another user's personal project", async () => {
		await createDataStore(ownerProject, { name: 'Personal Data Store' });

		const response = await authAdminAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should list data stores from team projects where user has project:viewer role', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createDataStore(project, { name: 'Test Data Store' });

		const response = await authMemberAgent.get('/data-tables-global').expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Store');
	});

	test("should list data stores from user's own personal project", async () => {
		await createDataStore(ownerProject, { name: 'Personal Data Store 1' });
		await createDataStore(ownerProject, { name: 'Personal Data Store 2' });

		const response = await authOwnerAgent.get('/data-tables-global').expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: DataStore) => f.name).sort()).toEqual(
			['Personal Data Store 1', 'Personal Data Store 2'].sort(),
		);
	});

	test('should filter data stores by projectId', async () => {
		await createDataStore(ownerProject, { name: 'Test Data Store 1' });
		await createDataStore(ownerProject, { name: 'Test Data Store 2' });
		await createDataStore(memberProject, { name: 'Another Data Store' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ projectId: ownerProject.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: DataStore) => f.name).sort()).toEqual(
			['Test Data Store 1', 'Test Data Store 2'].sort(),
		);
	});

	test('should not list projects the user cant access even with project filters', async () => {
		await createDataStore(ownerProject, { name: 'Test Data Store 1' });
		await createDataStore(ownerProject, { name: 'Test Data Store 2' });
		await createDataStore(memberProject, { name: 'Another Data Store' });

		const response = await authMemberAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ projectId: ownerProject.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should filter data stores by name', async () => {
		const project = await createTeamProject('test project', owner);

		await createDataStore(ownerProject, { name: 'Test Data Store' });
		await createDataStore(ownerProject, { name: 'Another Data Store' });
		await createDataStore(project, { name: 'Test Something Else' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: any) => f.name).sort()).toEqual(
			['Test Data Store', 'Test Something Else'].sort(),
		);
	});

	test('should filter data stores by id', async () => {
		const dataStore1 = await createDataStore(ownerProject, { name: 'Data Store 1' });
		await createDataStore(ownerProject, { name: 'Data Store 2' });
		await createDataStore(ownerProject, { name: 'Data Store 3' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ id: dataStore1.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Data Store 1');
	});

	test('should filter data stores by multiple names (AND operator)', async () => {
		const project = await createTeamProject('test project', owner);

		await createDataStore(ownerProject, { name: 'Data Store' });
		await createDataStore(ownerProject, { name: 'Test Store' });
		await createDataStore(project, { name: 'Another Store' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ name: ['Store', 'Test'] }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Store');
	});

	test('should apply pagination with take parameter', async () => {
		const project = await createTeamProject('test project', owner);
		for (let i = 1; i <= 5; i++) {
			await createDataStore(i % 2 ? ownerProject : project, {
				name: `Data Store ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent.get('/data-tables-global').query({ take: 3 }).expect(200);

		expect(response.body.data.count).toBe(5); // Total count should be 5
		expect(response.body.data.data).toHaveLength(3); // But only 3 returned
		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'Data Store 5',
			'Data Store 4',
			'Data Store 3',
		]);
	});

	test('should apply pagination with skip parameter', async () => {
		const project = await createTeamProject('test project', owner);
		for (let i = 1; i <= 5; i++) {
			await createDataStore(i % 2 ? ownerProject : project, {
				name: `Data Store ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent.get('/data-tables-global').query({ skip: 2 }).expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(3);
		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'Data Store 3',
			'Data Store 2',
			'Data Store 1',
		]);
	});

	test('should apply combined skip and take parameters', async () => {
		const project = await createTeamProject('test project', owner);
		for (let i = 1; i <= 5; i++) {
			await createDataStore(i % 2 ? ownerProject : project, {
				name: `Data Store ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ skip: 1, take: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'Data Store 4',
			'Data Store 3',
		]);
	});

	test('should sort data stores by name ascending', async () => {
		await createDataStore(ownerProject, { name: 'Z Data Store' });
		await createDataStore(ownerProject, { name: 'A Data Store' });
		await createDataStore(ownerProject, { name: 'M Data Store' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.data.map((store: DataStore) => store.name)).toEqual([
			'A Data Store',
			'M Data Store',
			'Z Data Store',
		]);
	});

	test('should sort data stores by name descending', async () => {
		await createDataStore(ownerProject, { name: 'Z Data Store' });
		await createDataStore(ownerProject, { name: 'A Data Store' });
		await createDataStore(ownerProject, { name: 'M Data Store' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ sortBy: 'name:desc' })
			.expect(200);

		expect(response.body.data.data.map((f: DataStore) => f.name)).toEqual([
			'Z Data Store',
			'M Data Store',
			'A Data Store',
		]);
	});

	test('should sort data stores by updatedAt', async () => {
		await createDataStore(ownerProject, {
			name: 'Older Data Store',
			updatedAt: DateTime.now().minus({ days: 2 }).toJSDate(),
		});
		await createDataStore(ownerProject, {
			name: 'Newest Data Store',
			updatedAt: DateTime.now().toJSDate(),
		});
		await createDataStore(ownerProject, {
			name: 'Middle Data Store',
			updatedAt: DateTime.now().minus({ days: 1 }).toJSDate(),
		});

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);

		expect(response.body.data.data.map((f: DataStore) => f.name)).toEqual([
			'Newest Data Store',
			'Middle Data Store',
			'Older Data Store',
		]);
	});

	test('should combine multiple query parameters correctly', async () => {
		const dataStore1 = await createDataStore(ownerProject, { name: 'Test Data Store' });
		await createDataStore(ownerProject, { name: 'Another Data Store' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ name: 'data', id: dataStore1.id }), sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Store');
	});

	test('should include columns', async () => {
		await createDataStore(ownerProject, {
			name: 'Test Data Store',
			columns: [
				{
					name: 'test_column_1',
					type: 'string',
				},
				{
					name: 'test_column_2',
					type: 'boolean',
				},
			],
		});

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].columns).toHaveLength(2);
	});
});
