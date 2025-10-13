import type { DataTable } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { DateTime } from 'luxon';

import { createDataTable } from '@test-integration/db/data-tables';
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
	test('should not list data tables when no data tables exist', async () => {
		const response = await authOwnerAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should not list data tables from projects member has no access to', async () => {
		const project = await createTeamProject('test project', owner);
		await createDataTable(project, { name: 'Test Data Table' });
		const response = await authMemberAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should not list data tables from projects admin has no access to', async () => {
		const project = await createTeamProject('test project', owner);
		await createDataTable(project, { name: 'Test Data Table' });

		const response = await authAdminAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test("should not list data tables from another user's personal project", async () => {
		await createDataTable(ownerProject, { name: 'Personal Data Table' });

		const response = await authAdminAgent.get('/data-tables-global').expect(200);
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should list data tables from team projects where user has project:viewer role', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createDataTable(project, { name: 'Test Data Table' });

		const response = await authMemberAgent.get('/data-tables-global').expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Table');
	});

	test("should list data tables from user's own personal project", async () => {
		await createDataTable(ownerProject, { name: 'Personal Data Table 1' });
		await createDataTable(ownerProject, { name: 'Personal Data Table 2' });

		const response = await authOwnerAgent.get('/data-tables-global').expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: DataTable) => f.name).sort()).toEqual(
			['Personal Data Table 1', 'Personal Data Table 2'].sort(),
		);
	});

	test('should filter data tables by projectId', async () => {
		await createDataTable(ownerProject, { name: 'Test Data Table 1' });
		await createDataTable(ownerProject, { name: 'Test Data Table 2' });
		await createDataTable(memberProject, { name: 'Another Data Table' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ projectId: ownerProject.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: DataTable) => f.name).sort()).toEqual(
			['Test Data Table 1', 'Test Data Table 2'].sort(),
		);
	});

	test('should not list projects the user cant access even with project filters', async () => {
		await createDataTable(ownerProject, { name: 'Test Data Table 1' });
		await createDataTable(ownerProject, { name: 'Test Data Table 2' });
		await createDataTable(memberProject, { name: 'Another Data Table' });

		const response = await authMemberAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ projectId: ownerProject.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(0);
		expect(response.body.data.data).toHaveLength(0);
	});

	test('should filter data tables by name', async () => {
		const project = await createTeamProject('test project', owner);

		await createDataTable(ownerProject, { name: 'Test Data Table' });
		await createDataTable(ownerProject, { name: 'Another Data Table' });
		await createDataTable(project, { name: 'Test Something Else' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect(response.body.data.data.map((f: any) => f.name).sort()).toEqual(
			['Test Data Table', 'Test Something Else'].sort(),
		);
	});

	test('should filter data tables by id', async () => {
		const dataTable1 = await createDataTable(ownerProject, { name: 'Data Table 1' });
		await createDataTable(ownerProject, { name: 'Data Table 2' });
		await createDataTable(ownerProject, { name: 'Data Table 3' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ id: dataTable1.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Data Table 1');
	});

	test('should filter data tables by multiple names (AND operator)', async () => {
		const project = await createTeamProject('test project', owner);

		await createDataTable(ownerProject, { name: 'Data Table' });
		await createDataTable(ownerProject, { name: 'Test Store' });
		await createDataTable(project, { name: 'Another Store' });

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
			await createDataTable(i % 2 ? ownerProject : project, {
				name: `Data Table ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent.get('/data-tables-global').query({ take: 3 }).expect(200);

		expect(response.body.data.count).toBe(5); // Total count should be 5
		expect(response.body.data.data).toHaveLength(3); // But only 3 returned
		expect(response.body.data.data.map((dataTable: DataTable) => dataTable.name)).toEqual([
			'Data Table 5',
			'Data Table 4',
			'Data Table 3',
		]);
	});

	test('should apply pagination with skip parameter', async () => {
		const project = await createTeamProject('test project', owner);
		for (let i = 1; i <= 5; i++) {
			await createDataTable(i % 2 ? ownerProject : project, {
				name: `Data Table ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent.get('/data-tables-global').query({ skip: 2 }).expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(3);
		expect(response.body.data.data.map((dataTable: DataTable) => dataTable.name)).toEqual([
			'Data Table 3',
			'Data Table 2',
			'Data Table 1',
		]);
	});

	test('should apply combined skip and take parameters', async () => {
		const project = await createTeamProject('test project', owner);
		for (let i = 1; i <= 5; i++) {
			await createDataTable(i % 2 ? ownerProject : project, {
				name: `Data Table ${i}`,
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
		expect(response.body.data.data.map((dataTable: DataTable) => dataTable.name)).toEqual([
			'Data Table 4',
			'Data Table 3',
		]);
	});

	test('should sort data tables by name ascending', async () => {
		await createDataTable(ownerProject, { name: 'Z Data Table' });
		await createDataTable(ownerProject, { name: 'A Data Table' });
		await createDataTable(ownerProject, { name: 'M Data Table' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.data.map((dataTable: DataTable) => dataTable.name)).toEqual([
			'A Data Table',
			'M Data Table',
			'Z Data Table',
		]);
	});

	test('should sort data tables by name descending', async () => {
		await createDataTable(ownerProject, { name: 'Z Data Table' });
		await createDataTable(ownerProject, { name: 'A Data Table' });
		await createDataTable(ownerProject, { name: 'M Data Table' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ sortBy: 'name:desc' })
			.expect(200);

		expect(response.body.data.data.map((f: DataTable) => f.name)).toEqual([
			'Z Data Table',
			'M Data Table',
			'A Data Table',
		]);
	});

	test('should sort data tables by updatedAt', async () => {
		await createDataTable(ownerProject, {
			name: 'Older Data Table',
			updatedAt: DateTime.now().minus({ days: 2 }).toJSDate(),
		});
		await createDataTable(ownerProject, {
			name: 'Newest Data Table',
			updatedAt: DateTime.now().toJSDate(),
		});
		await createDataTable(ownerProject, {
			name: 'Middle Data Table',
			updatedAt: DateTime.now().minus({ days: 1 }).toJSDate(),
		});

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);

		expect(response.body.data.data.map((f: DataTable) => f.name)).toEqual([
			'Newest Data Table',
			'Middle Data Table',
			'Older Data Table',
		]);
	});

	test('should combine multiple query parameters correctly', async () => {
		const dataTable1 = await createDataTable(ownerProject, { name: 'Test Data Table' });
		await createDataTable(ownerProject, { name: 'Another Data Table' });

		const response = await authOwnerAgent
			.get('/data-tables-global')
			.query({ filter: JSON.stringify({ name: 'data', id: dataTable1.id }), sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Table');
	});

	test('should include columns', async () => {
		await createDataTable(ownerProject, {
			name: 'Test Data Table',
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
