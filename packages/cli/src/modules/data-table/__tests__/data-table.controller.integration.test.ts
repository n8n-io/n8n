/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DataTable, DataTableCreateColumnSchema } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository, QueryFailedError } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import type { DataTableRow } from 'n8n-workflow';

import { createDataTable } from '@test-integration/db/data-tables';
import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { DataTableColumnRepository } from '../data-table-column.repository';
import { DataTableRowsRepository } from '../data-table-rows.repository';
import { DataTableRepository } from '../data-table.repository';
import { mockDataTableSizeValidator } from './test-helpers';

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
let projectRepository: ProjectRepository;
let dataTableRepository: DataTableRepository;
let dataTableColumnRepository: DataTableColumnRepository;
let dataTableRowsRepository: DataTableRowsRepository;

beforeAll(async () => {
	mockDataTableSizeValidator();

	projectRepository = Container.get(ProjectRepository);
	dataTableRepository = Container.get(DataTableRepository);
	dataTableColumnRepository = Container.get(DataTableColumnRepository);
	dataTableRowsRepository = Container.get(DataTableRowsRepository);

	owner = await createOwner();
	member = await createMember();
	admin = await createAdmin();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAdminAgent = testServer.authAgentFor(admin);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

describe('POST /projects/:projectId/data-tables', () => {
	test('should not create data table when project does not exist', async () => {
		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post('/projects/non-existing-id/data-tables').send(payload).expect(403);
		await authAdminAgent.post('/projects/non-existing-id/data-tables').send(payload).expect(403);
		await authOwnerAgent.post('/projects/non-existing-id/data-tables').send(payload).expect(403);
	});

	test('should not create data table when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const payload = {
			name: '',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authOwnerAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(400);
	});

	test('should not create data table if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(403);

		const dataTablesInDb = await dataTableRepository.find();
		expect(dataTablesInDb).toHaveLength(0);
	});

	test("should not create data table in another user's personal project", async () => {
		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables`)
			.send(payload)
			.expect(403);
	});

	test('should create data table if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authMemberAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(200);

		const dataTablesInDb = await dataTableRepository.find();
		expect(dataTablesInDb).toHaveLength(1);
	});

	test('should create data table if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(admin, project, 'project:admin');

		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authAdminAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(200);

		const dataTablesInDb = await dataTableRepository.find();
		expect(dataTablesInDb).toHaveLength(1);
	});

	test('should create data table if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);

		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		await authOwnerAgent.post(`/projects/${project.id}/data-tables`).send(payload).expect(200);

		const dataTablesInDb = await dataTableRepository.find();
		expect(dataTablesInDb).toHaveLength(1);
	});

	test('should create data table in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const payload = {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test_ccolumn',
					type: 'string',
				},
			],
		};

		const response = await authOwnerAgent
			.post(`/projects/${personalProject.id}/data-tables`)
			.send(payload)
			.expect(200);

		expect(response.body.data).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: payload.name,
				projectId: personalProject.id,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: response.body.data.id });
		expect(dataTableInDb).toBeDefined();
		expect(dataTableInDb?.name).toBe(payload.name);
	});
});

describe('GET /projects/:projectId/data-tables', () => {
	test('should not list data tables when project does not exist', async () => {
		await authMemberAgent.get('/projects/non-existing-id/data-tables').expect(403);
		await authAdminAgent.get('/projects/non-existing-id/data-tables').expect(403);
		await authOwnerAgent.get('/projects/non-existing-id/data-tables').expect(403);
	});

	test('should not list data tables if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authMemberAgent.get(`/projects/${project.id}/data-tables`).expect(403);
	});

	test('should not list data tables if admin has no access to project', async () => {
		const project = await createTeamProject('test project', owner);

		await authAdminAgent.get(`/projects/${project.id}/data-tables`).expect(403);
	});

	test("should not list data tables from another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/data-tables`).expect(403);
	});

	test('should list data tables if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		await createDataTable(project, { name: 'Test Data Table' });

		const response = await authMemberAgent.get(`/projects/${project.id}/data-tables`).expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Data Table');
	});

	test('should list data tables from personal project', async () => {
		await createDataTable(ownerProject, { name: 'Personal Data Table 1' });
		await createDataTable(ownerProject, { name: 'Personal Data Table 2' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataTable[]).map((f) => f.name).sort()).toEqual(
			['Personal Data Table 1', 'Personal Data Table 2'].sort(),
		);
	});

	test('should filter data tables by projectId', async () => {
		await createDataTable(ownerProject, { name: 'Test Data Table 1' });
		await createDataTable(ownerProject, { name: 'Test Data Table 2' });
		await createDataTable(memberProject, { name: 'Another Data Table' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataTable[]).map((f) => f.name).sort()).toEqual(
			['Test Data Table 1', 'Test Data Table 2'].sort(),
		);
	});

	test('should filter data tables by name', async () => {
		await createDataTable(ownerProject, { name: 'Test Data Table' });
		await createDataTable(ownerProject, { name: 'Another Data Table' });
		await createDataTable(ownerProject, { name: 'Test Something Else' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataTable[]).map((f) => f.name).sort()).toEqual(
			['Test Data Table', 'Test Something Else'].sort(),
		);
	});

	test('should filter data tables by id', async () => {
		const dataTable1 = await createDataTable(ownerProject, { name: 'Data Table 1' });
		await createDataTable(ownerProject, { name: 'Data Table 2' });
		await createDataTable(ownerProject, { name: 'Data Table 3' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ id: dataTable1.id }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Data Table 1');
	});

	test('should filter data tables by multiple names (AND operator)', async () => {
		await createDataTable(ownerProject, { name: 'Data Table' });
		await createDataTable(ownerProject, { name: 'Test Table' });
		await createDataTable(ownerProject, { name: 'Another Table' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: ['Table', 'Test'] }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].name).toBe('Test Table');
	});

	test('should apply pagination with take parameter', async () => {
		for (let i = 1; i <= 5; i++) {
			await createDataTable(ownerProject, {
				name: `Data Table ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ take: 3 })
			.expect(200);

		expect(response.body.data.count).toBe(5); // Total count should be 5
		expect(response.body.data.data).toHaveLength(3); // But only 3 returned
		expect((response.body.data.data as DataTable[]).map((dataTable) => dataTable.name)).toEqual([
			'Data Table 5',
			'Data Table 4',
			'Data Table 3',
		]);
	});

	test('should apply pagination with skip parameter', async () => {
		for (let i = 1; i <= 5; i++) {
			await createDataTable(ownerProject, {
				name: `Data Table ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ skip: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(3);
		expect((response.body.data.data as DataTable[]).map((dataTable) => dataTable.name)).toEqual([
			'Data Table 3',
			'Data Table 2',
			'Data Table 1',
		]);
	});

	test('should apply combined skip and take parameters', async () => {
		for (let i = 1; i <= 5; i++) {
			await createDataTable(ownerProject, {
				name: `Data Table ${i}`,
				updatedAt: DateTime.now()
					.minus({ minutes: 6 - i })
					.toJSDate(),
			});
		}

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ skip: 1, take: 2 })
			.expect(200);

		expect(response.body.data.count).toBe(5);
		expect(response.body.data.data).toHaveLength(2);
		expect((response.body.data.data as DataTable[]).map((dataTable) => dataTable.name)).toEqual([
			'Data Table 4',
			'Data Table 3',
		]);
	});

	test('should sort data tables by name ascending', async () => {
		await createDataTable(ownerProject, { name: 'Z Data Table' });
		await createDataTable(ownerProject, { name: 'A Data Table' });
		await createDataTable(ownerProject, { name: 'M Data Table' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ sortBy: 'name:asc' })
			.expect(200);

		expect((response.body.data.data as DataTable[]).map((dataTable) => dataTable.name)).toEqual([
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ sortBy: 'name:desc' })
			.expect(200);

		expect((response.body.data.data as DataTable[]).map((f) => f.name)).toEqual([
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ sortBy: 'updatedAt:desc' })
			.expect(200);

		expect((response.body.data.data as DataTable[]).map((f) => f.name)).toEqual([
			'Newest Data Table',
			'Middle Data Table',
			'Older Data Table',
		]);
	});

	test('should combine multiple query parameters correctly', async () => {
		const dataTable1 = await createDataTable(ownerProject, { name: 'Test Data Table' });
		await createDataTable(ownerProject, { name: 'Another Data Table' });

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/data-tables`)
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
			.get(`/projects/${ownerProject.id}/data-tables`)
			.query({ filter: JSON.stringify({ name: 'test' }) })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].columns).toHaveLength(2);
	});
});

describe('PATCH /projects/:projectId/data-tables/:dataTableId', () => {
	test('should not update data table when project does not exist', async () => {
		const payload = {
			name: 'Updated Data Table Name',
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/data-tables/some-data-table-id')
			.send(payload)
			.expect(403);
	});

	test('should not update data table when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/non-existing-data-table`)
			.send(payload)
			.expect(404);
	});

	test('should not update data table when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, { name: 'Original Name' });

		const payload = {
			name: '',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(400);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Original Name');
	});

	test('should not update data table if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:viewer');

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(403);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Original Name');
	});

	test("should not update data table in another user's personal project", async () => {
		const dataTable = await createDataTable(ownerProject, { name: 'Original Name' });

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authMemberAgent
			.patch(`/projects/${ownerProject.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(403);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Original Name');
	});

	test('should update data table if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, { name: 'Original Name' });
		await linkUserToProject(member, project, 'project:editor');

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Updated Data Table Name');
	});

	test('should update data table if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, { name: 'Original Name' });
		await linkUserToProject(admin, project, 'project:admin');

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authAdminAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Updated Data Table Name');
	});

	test('should update data table if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, { name: 'Original Name' });

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Updated Data Table Name');
	});

	test('should update data table in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const dataTable = await createDataTable(personalProject, { name: 'Original Name' });

		const payload = {
			name: 'Updated Data Table Name',
		};

		await authOwnerAgent
			.patch(`/projects/${personalProject.id}/data-tables/${dataTable.id}`)
			.send(payload)
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb?.name).toBe('Updated Data Table Name');
	});
});

describe('DELETE /projects/:projectId/data-tables/:dataTableId', () => {
	test('should not delete data table when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/data-tables/some-data-table-id')
			.send({})
			.expect(403);
	});

	test('should not delete data table when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/non-existing-data-table`)
			.send({})
			.expect(404);
	});

	test('should not delete data table if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project);
		await linkUserToProject(member, project, 'project:viewer');

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(403);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeDefined();
	});

	test("should not delete data table in another user's personal project", async () => {
		const dataTable = await createDataTable(ownerProject);

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(403);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeDefined();
	});

	test('should delete data table if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project);
		await linkUserToProject(member, project, 'project:editor');

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeNull();
	});

	test('should delete data table if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project);
		await linkUserToProject(admin, project, 'project:admin');

		await authAdminAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeNull();
	});

	test('should delete data table if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeNull();
	});

	test('should delete data table in personal project', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const dataTable = await createDataTable(personalProject);

		await authOwnerAgent
			.delete(`/projects/${personalProject.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeNull();
	});

	test("should delete data from 'data_table', 'data_table_column' tables and drop 'data_table_user_<id>' table", async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const dataTable = await createDataTable(personalProject, {
			name: 'Test Data Table',
			columns: [
				{
					name: 'test',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${personalProject.id}/data-tables/${dataTable.id}`)
			.send({})
			.expect(200);

		const dataTableInDb = await dataTableRepository.findOneBy({ id: dataTable.id });
		expect(dataTableInDb).toBeNull();

		const dataTableColumnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
		});
		expect(dataTableColumnInDb).toBeNull();

		await expect(dataTableRowsRepository.getManyAndCount(dataTable.id, {})).rejects.toThrow(
			QueryFailedError,
		);
	});
});

describe('GET /projects/:projectId/data-tables/:dataTableId/columns', () => {
	test('should not list columns when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/data-tables/non-existing-id/columns')
			.expect(403);
	});

	test('should not list columns if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project);

		await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.expect(403);
	});

	test("should not list columns from data tables in another user's personal project", async () => {
		await authMemberAgent.get(`/projects/${ownerProject.id}/data-tables`).expect(403);
	});

	test('should not list columns when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/non-existing-id/columns`)
			.expect(404);
	});

	test('should list columns if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'boolean',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.expect(200);

		expect(response.body.data).toHaveLength(2);
		expect(response.body.data[0].name).toBe('test_column');
		expect(response.body.data[1].name).toBe('another_column');
	});

	test('should list columns if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('test_column');
	});

	test('should list columns from personal project data table', async () => {
		const dataTable = await createDataTable(memberProject, {
			name: 'Personal Data Table 1',
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/columns`)
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe('test_column');
	});
});

describe('POST /projects/:projectId/data-tables/:dataTableId/columns', () => {
	test('should not create column when project does not exist', async () => {
		const payload = {
			name: 'Test Column',
			type: 'string',
		};

		await authOwnerAgent
			.post('/projects/non-existing-id/data-tables/some-data-table-id/columns')
			.send(payload)
			.expect(403);
	});

	test('should not create column when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		const payload = {
			name: 'test_column',
			type: 'string',
			index: 0,
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/non-existing-data-table/columns`)
			.send(payload)
			.expect(404);
	});

	test('should not create column when name is empty', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project);

		const payload = {
			name: '',
			type: 'string',
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(400);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(0);
	});

	test("should not create column when name isn't valid", async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project);

		const payload = {
			name: 'invalid name',
			type: 'string',
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(400);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(0);
	});

	test("should not create column in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/columns`)
			.send({
				name: 'new_column',
				type: 'string',
			})
			.expect(403);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(1);
		expect(columnsInDb[0].name).toBe('test_column');
	});

	test('should not create column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project);

		const payload = {
			name: 'test_column',
			type: 'string',
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(403);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(0);
	});

	test('should create column if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const payload = {
			name: 'new_column',
			type: 'string',
			index: 0,
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(200);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(2);
		expect(columnsInDb[0].name).toBe('new_column');
		expect(columnsInDb[0].type).toBe('string');
	});

	test('should create column if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const payload = {
			name: 'new_column',
			type: 'boolean',
			index: 0,
		};

		await authAdminAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(200);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(2);
		expect(columnsInDb[0].name).toBe('new_column');
		expect(columnsInDb[0].type).toBe('boolean');
		expect(columnsInDb[1].name).toBe('test_column');
		expect(columnsInDb[1].type).toBe('string');
	});

	test('should create column if user has is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		const payload = {
			name: 'new_column',
			type: 'boolean',
			index: 0,
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(200);

		const columnsInDb = await dataTableColumnRepository.findBy({ dataTableId: dataTable.id });
		expect(columnsInDb).toHaveLength(2);
		expect(columnsInDb[0].name).toBe('new_column');
		expect(columnsInDb[0].type).toBe('boolean');
		expect(columnsInDb[1].name).toBe('test_column');
		expect(columnsInDb[1].type).toBe('string');
	});

	test('should place the column in correct index', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column_1',
					type: 'string',
				},
				{
					name: 'test_column_2',
					type: 'string',
				},
			],
		});

		const payload: DataTableCreateColumnSchema = {
			name: 'new_column',
			type: 'boolean',
			index: 1,
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/columns`)
			.send(payload)
			.expect(200);

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		expect(columns).toHaveLength(3);
		expect(columns[0].name).toBe('test_column_1');
		expect(columns[1].name).toBe('new_column');
		expect(columns[2].name).toBe('test_column_2');
	});
});

describe('DELETE /projects/:projectId/data-tables/:dataTableId/columns/:columnId', () => {
	test('should not delete column when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/data-tables/some-data-table-id/columns/some-column-id')
			.send({})
			.expect(403);
	});

	test('should not delete column when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/non-existing-id/columns/some-column-id`)
			.send()
			.expect(404);
	});

	test('should not delete column when column does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/columns/non-existing-id`)
			.send()
			.expect(404);
	});

	test("should not delete column in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/columns/test_column`)
			.send()
			.expect(403);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeDefined();
	});

	test('should not delete column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});
		await linkUserToProject(member, project, 'project:viewer');

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/columns/test_column`)
			.send()
			.expect(403);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeDefined();
	});

	test('should delete column if user has project:editor role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});

	test('should delete column if user has project:admin role in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authAdminAgent
			.delete(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});

	test('should delete column if user is owner in team project', async () => {
		const project = await createTeamProject(undefined, owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});

	test('should delete column in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.delete(
				`/projects/${memberProject.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}`,
			)
			.send()
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
		});
		expect(columnInDb).toBeNull();
	});
});

describe('PATCH /projects/:projectId/data-tables/:dataTableId/columns/:columnId/move', () => {
	test('should not move column when project does not exist', async () => {
		const payload = {
			index: 1,
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/data-tables/some-data-table-id/columns/some-column-id/move')
			.send(payload)
			.expect(403);
	});

	test('should not move column when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			targetIndex: 1,
		};

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/non-existing-data-table/columns/some-column-id/move`,
			)
			.send(payload)
			.expect(404);
	});

	test('should not move column when column does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});
		const payload = {
			targetIndex: 1,
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}/columns/some-column-id/move`)
			.send(payload)
			.expect(404);
	});

	test("should not move column in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${ownerProject.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(403);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
			index: 0,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should not move column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(403);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
			index: 0,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authAdminAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column if user is owner in team project', async () => {
		const project = await createTeamProject('test project', owner);

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});

	test('should move column in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${memberProject.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/move`,
			)
			.send({ targetIndex: 1 })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			dataTableId: dataTable.id,
			name: 'test-column',
			index: 1,
		});
		expect(columnInDb).toBeDefined();
	});
});

describe('GET /projects/:projectId/data-tables/:dataTableId/rows', () => {
	test('should not list rows when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/data-tables/some-data-table-id/rows')
			.expect(403);
	});

	test('should not list rows when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/non-existing-id/rows`)
			.expect(404);
	});

	test("should not list rows in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
				{
					name: 'another_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.get(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(403);
	});

	test('should list rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test('should list rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test('should list rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authAdminAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test('should list rows in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			count: 1,
			data: [
				{
					id: 1,
					first: 'test value',
					second: 'another value',
				},
			],
		});
	});

	test("should parse 'eq' filters correctly", async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
			],
			data: [
				{
					name: 'John',
				},
				{
					name: 'Jane',
				},
				{
					name: 'Tom',
				},
			],
		});

		const filterParam = encodeURIComponent(
			JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'name', value: 'John', condition: 'eq' }],
			}),
		);

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows?filter=${filterParam}`)
			.expect(200);

		expect(response.body.data).toEqual({
			count: 1,
			data: [
				expect.objectContaining({
					name: 'John',
				}),
			],
		});
	});

	test("should parse 'like' filters correctly", async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
			],
			data: [
				{
					name: 'John',
				},
				{
					name: 'Jane',
				},
				{
					name: 'Tom',
				},
			],
		});

		const filterParam = encodeURIComponent(
			JSON.stringify({
				type: 'and',
				filters: [{ columnName: 'name', value: '%j%', condition: 'ilike' }],
			}),
		);

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows?filter=${filterParam}`)
			.expect(200);

		expect(response.body.data).toEqual({
			count: 2,
			data: [
				expect.objectContaining({
					name: 'John',
				}),
				expect.objectContaining({
					name: 'Jane',
				}),
			],
		});
	});

	test.each([
		['gt', '>', 25, ['Bob'], ['Alice', 'Carol']],
		['gte', '>=', 25, ['Bob', 'Carol'], ['Alice']],
		['lt', '<', 25, ['Alice'], ['Bob', 'Carol']],
		['lte', '<=', 25, ['Alice', 'Carol'], ['Bob']],
	])(
		'should filter rows using %s (%s) condition correctly',
		async (condition, _operator, value, expectedNames, excludedNames) => {
			const dataTable = await createDataTable(memberProject, {
				columns: [
					{
						name: 'name',
						type: 'string',
					},
					{
						name: 'age',
						type: 'number',
					},
				],
				data: [
					{
						name: 'Alice',
						age: 20,
					},
					{
						name: 'Bob',
						age: 30,
					},
					{
						name: 'Carol',
						age: 25,
					},
				],
			});

			const filterParam = encodeURIComponent(
				JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'age', value, condition }],
				}),
			);
			const response = await authMemberAgent
				.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows?filter=${filterParam}`)
				.expect(200);

			expect(response.body.data.count).toBe(expectedNames.length);
			const returnedNames = (response.body.data.data as DataTableRow[]).map((row) => row.name);

			for (const expectedName of expectedNames) {
				expect(returnedNames).toContain(expectedName);
			}

			for (const excludedName of excludedNames) {
				expect(returnedNames).not.toContain(excludedName);
			}
		},
	);

	test.each(['like', 'ilike'])(
		'should auto-wrap %s filters if no wildcard is present',
		async (condition) => {
			const dataTable = await createDataTable(memberProject, {
				columns: [
					{
						name: 'name',
						type: 'string',
					},
				],
				data: [
					{
						name: 'Alice Smith',
					},
					{
						name: 'Bob Jones',
					},
					{
						name: 'Carol Brown',
					},
				],
			});

			const filterParam = encodeURIComponent(
				JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'name', value: 'Alice', condition }],
				}),
			);
			const response = await authMemberAgent
				.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows?filter=${filterParam}`)
				.expect(200);

			expect(response.body.data.count).toBe(1);
			expect(response.body.data.data[0].name).toBe('Alice Smith');
		},
	);
});

describe('POST /projects/:projectId/data-tables/:dataTableId/insert', () => {
	test('should not insert rows when project does not exist', async () => {
		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authOwnerAgent
			.post('/projects/non-existing-id/data-tables/some-data-table-id/insert')
			.send(payload)
			.expect(403);
	});

	test('should not insert rows when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/non-existing-id/insert`)
			.send(payload)
			.expect(404);
	});

	test("should not insert rows in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(403);
	});

	test('should not insert rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(403);
	});

	test('should insert rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		const response = await authAdminAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert rows in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should return inserted data if returnData is set', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			returnType: 'all',
			data: [
				{
					first: 'first row',
					second: 'some value',
				},
				{
					first: 'another row',
					second: 'another value',
				},
			],
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [
				{
					id: 1,
					first: 'first row',
					second: 'some value',
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
				{
					id: 2,
					first: 'another row',
					second: 'another value',
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			],
		});

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(2);
		expect(rowsInDb.data[0]).toMatchObject(payload.data[0]);
	});

	test('should not insert rows when column does not exist', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					first: 'test value',
					nonexisting: 'this does not exist',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(0);
	});

	test('should insert columns with dates', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'date',
				},
				{
					name: 'b',
					type: 'date',
				},
			],
		});

		const payload = {
			data: [
				{
					a: '2025-08-15T09:48:14.259Z',
					b: '2025-08-15T12:34:56+02:00',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			a: '2025-08-15T09:48:14.259Z',
			b: '2025-08-15T10:34:56.000Z',
		});
	});

	test('should insert columns with strings', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'string',
				},
				{
					name: 'b',
					type: 'string',
				},
				{
					name: 'c',
					type: 'string',
				},
			],
		});

		const payload = {
			data: [
				{
					a: 'some string',
					b: '',
					c: '2025-08-15T09:48:14.259Z',
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert columns with booleans', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'boolean',
				},
				{
					name: 'b',
					type: 'boolean',
				},
			],
		});

		const payload = {
			data: [
				{
					a: true,
					b: false,
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert columns with numbers', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'number',
				},
				{
					name: 'b',
					type: 'number',
				},
				{
					name: 'c',
					type: 'number',
				},
				{
					name: 'd',
					type: 'number',
				},
				{
					name: 'e',
					type: 'number',
				},
			],
		});

		const payload = {
			data: [
				{
					a: 1,
					b: 0,
					c: -1,
					d: 0.2340439341231259,
					e: 2340439341231259,
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert columns with null values', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'string',
				},
				{
					name: 'b',
					type: 'number',
				},
				{
					name: 'c',
					type: 'boolean',
				},
				{
					name: 'd',
					type: 'date',
				},
			],
		});

		const payload = {
			data: [
				{
					a: null,
					b: null,
					c: null,
					d: null,
				},
			],
			returnType: 'id',
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(response.body).toEqual({
			data: [{ id: 1 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject(payload.data[0]);
	});

	test('should insert multiple rows', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'a',
					type: 'string',
				},
				{
					name: 'b',
					type: 'number',
				},
			],
		});

		const payload = {
			data: [
				{
					a: 'first',
					b: 1,
				},
				{
					a: 'second',
					b: 2,
				},
				{
					a: 'third',
					b: 3,
				},
			],
			returnType: 'id',
		};

		const first = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(first.body).toEqual({
			data: [{ id: 1 }, { id: 2 }, { id: 3 }],
		});

		const second = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/insert`)
			.send(payload)
			.expect(200);

		expect(second.body).toEqual({
			data: [{ id: 4 }, { id: 5 }, { id: 6 }],
		});

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(6);
		expect(readResponse.body.data.data).toMatchObject([...payload.data, ...payload.data]);
	});
});

describe('DELETE /projects/:projectId/data-tables/:dataTableId/rows', () => {
	test('should not delete rows when project does not exist', async () => {
		await authOwnerAgent
			.delete('/projects/non-existing-id/data-tables/some-data-table-id/rows')
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value' }],
				}),
			})
			.expect(403);
	});

	test('should not delete rows when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/non-existing-id/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value' }],
				}),
			})
			.expect(404);
	});

	test('should not delete rows when no filter is provided', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(400);
	});

	test('should not delete rows when filter has empty filters array', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: {
					type: 'and',
					filters: [],
				},
			})
			.expect(400);
	});

	test("should not delete rows in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value' }],
				}),
			})
			.expect(403);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
	});

	test('should not delete rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value',
					second: 'another value',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value' }],
				}),
			})
			.expect(403);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
	});

	test('should delete rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
				{
					first: 'test value 3',
					second: 'another value 3',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'or',
					filters: [
						{ columnName: 'first', condition: 'eq', value: 'test value 1' },
						{ columnName: 'first', condition: 'eq', value: 'test value 3' },
					],
				}),
			})
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject({
			first: 'test value 2',
			second: 'another value 2',
		});
	});

	test('should delete rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
			],
		});

		await authAdminAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 2' }],
				}),
			})
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject({
			first: 'test value 1',
			second: 'another value 1',
		});
	});

	test('should delete rows if user is owner in team project', async () => {
		const project = await createTeamProject('test project', owner);

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
			],
		});

		await authOwnerAgent
			.delete(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 2' }],
				}),
			})
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data.map((r) => r.first)).toEqual(['test value 1']);
	});

	test('should delete rows in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
				{
					first: 'test value 3',
					second: 'another value 3',
				},
			],
		});

		await authMemberAgent
			.delete(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 2' }],
				}),
			})
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(2);
		expect(rowsInDb.data.map((r) => r.first).sort()).toEqual(['test value 1', 'test value 3']);
	});

	test('should return full deleted data if returnData is set', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'first',
					type: 'string',
				},
				{
					name: 'second',
					type: 'string',
				},
			],
			data: [
				{
					first: 'test value 1',
					second: 'another value 1',
				},
				{
					first: 'test value 2',
					second: 'another value 2',
				},
				{
					first: 'test value 3',
					second: 'another value 3',
				},
			],
		});

		const result = await authMemberAgent
			.delete(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.query({
				filter: JSON.stringify({
					type: 'and',
					filters: [{ columnName: 'first', condition: 'eq', value: 'test value 3' }],
				}),
				returnData: true,
			});

		expect(result.body.data).toEqual([
			{
				id: expect.any(Number),
				first: 'test value 3',
				second: 'another value 3',
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		]);
	});
});

describe('POST /projects/:projectId/data-tables/:dataTableId/upsert', () => {
	test('should not upsert rows when project does not exist', async () => {
		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authOwnerAgent
			.post('/projects/non-existing-id/data-tables/some-data-table-id/upsert')
			.send(payload)
			.expect(403);
	});

	test('should not upsert rows when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authOwnerAgent
			.post(`/projects/${project.id}/data-tables/non-existing-id/upsert`)
			.send(payload)
			.expect(404);
	});

	test("should not upsert rows in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(403);
	});

	test('should not upsert rows if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(403);
	});

	test('should upsert rows if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { name: 'Alice', age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data);
	});

	test('should upsert rows if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');

		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authAdminAgent
			.post(`/projects/${project.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data);
	});

	test('should upsert rows in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30 },
		};

		await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(200);

		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(1);
		expect(rowsInDb.data[0]).toMatchObject(payload.data);
	});

	test('should not upsert rows when column does not exist', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 30, nonexisting: 'this does not exist' },
		};

		const response = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
		const rowsInDb = await dataTableRowsRepository.getManyAndCount(dataTable.id, {});
		expect(rowsInDb.count).toBe(0);
	});

	test('should return updated row if returnData is set', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'age',
					type: 'number',
				},
			],
			data: [
				{
					name: 'Alice',
					age: 30,
				},
				{
					name: 'John',
					age: 25,
				},
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 35 },
			returnData: true,
		};

		const result = await authMemberAgent
			.post(`/projects/${memberProject.id}/data-tables/${dataTable.id}/upsert`)
			.send(payload)
			.expect(200);

		expect(result.body.data).toEqual([
			{
				id: expect.any(Number),
				name: 'Alice',
				age: 35,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		]);
	});
});

describe('PATCH /projects/:projectId/data-tables/:dataTableId/rows', () => {
	test('should not update row when project does not exist', async () => {
		const payload = {
			filter: { name: 'Alice' },
			data: { age: 31 },
		};

		await authOwnerAgent
			.patch('/projects/non-existing-id/data-tables/some-data-table-id/rows')
			.send(payload)
			.expect(403);
	});

	test('should not update row when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/non-existing-id/rows`)
			.send(payload)
			.expect(404);
	});

	test("should not update row in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(403);
	});

	test('should not update row if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { name: 'Alice' },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(403);
	});

	test('should update row if user has project:editor role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataTable = await createDataTable(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
				{ name: 'birthday', type: 'date' },
			],
			data: [{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01') }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { name: 'Alicia', age: 31, active: false, birthday: new Date('1990-01-02') },
		};

		const result = await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		expect(result.body.data).toBe(true);

		const readResponse = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			id: 1,
			name: 'Alicia',
			age: 31,
			active: false,
			birthday: new Date('1990-01-02').toISOString(),
		});
	});

	test('should update row if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(admin, project, 'project:admin');
		const dataTable = await createDataTable(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authAdminAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authAdminAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({ id: 1, name: 'Alice', age: 31 });
	});

	test('should update row if user is owner in team project', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			id: 1,
			name: 'Alice',
			age: 31,
		});
	});

	test('should update row in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			id: 1,
			name: 'Alice',
			age: 31,
		});
	});

	test('should update row by id filter', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
			data: { age: 31 },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(2);
		expect(readResponse.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 31,
				}),
				expect.objectContaining({
					id: 2,
					name: 'Bob',
					age: 25,
				}),
			]),
		);
	});

	test('should update row with multiple filter conditions', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'department', type: 'string' },
			],
			data: [
				{ name: 'Alice', age: 30, department: 'Engineering' },
				{ name: 'Alice', age: 25, department: 'Marketing' },
				{ name: 'Bob', age: 30, department: 'Engineering' },
			],
		});

		const payload = {
			filter: {
				type: 'and',
				filters: [
					{ columnName: 'name', condition: 'eq', value: 'Alice' },
					{ columnName: 'age', condition: 'eq', value: 30 },
				],
			},
			data: { department: 'Management' },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(3);
		expect(readResponse.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 1,
					name: 'Alice',
					age: 30,
					department: 'Management',
				}),
				expect.objectContaining({
					id: 2,
					name: 'Alice',
					age: 25,
					department: 'Marketing',
				}),
				expect.objectContaining({
					id: 3,
					name: 'Bob',
					age: 30,
					department: 'Engineering',
				}),
			]),
		);
	});

	test('should return true when no rows match the filter', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Charlie' }] },
			data: { age: 25 },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		expect(response.body.data).toEqual(true);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			name: 'Alice',
			age: 30,
		});
	});

	test('should fail when filter is empty', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
		});

		const payload = {
			filter: {},
			data: { name: 'Updated' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('filter must not be empty');
	});

	test('should fail when data is empty', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: {},
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('data must not be empty');
	});

	test('should fail when data contains invalid column names', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { invalidColumn: 'value' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
	});

	test('should fail when filter contains invalid column names', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [{ name: 'name', type: 'string' }],
			data: [{ name: 'Alice' }],
		});

		const payload = {
			filter: {
				type: 'and',
				filters: [{ columnName: 'invalidColumn', condition: 'eq', value: 'Alice' }],
			},
			data: { name: 'Updated' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('unknown column');
	});

	test('should validate data types in filter', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: {
				type: 'and',
				filters: [{ columnName: 'age', condition: 'eq', value: 'invalid_number' }],
			},
			data: { name: 'Updated' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('does not match column type');
	});

	test('should validate data types in data', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
			data: [{ name: 'Alice', age: 30 }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 'invalid_number' },
		};

		const response = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(400);

		expect(response.body.message).toContain('does not match column type');
	});

	test('should allow partial updates', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
			],
			data: [{ name: 'Alice', age: 30, active: true }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { age: 31 }, // Only updating age, not name or active
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			name: 'Alice',
			age: 31,
			active: true,
		});
	});

	test('should handle date values in updates', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'birthdate', type: 'date' },
			],
			data: [{ name: 'Alice', birthdate: '2000-01-01T00:00:00.000Z' }],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'name', condition: 'eq', value: 'Alice' }] },
			data: { birthdate: '1995-05-15T12:30:00.000Z' },
		};

		await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		const readResponse = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.expect(200);

		expect(readResponse.body.data.count).toBe(1);
		expect(readResponse.body.data.data[0]).toMatchObject({
			name: 'Alice',
			birthdate: '1995-05-15T12:30:00.000Z',
		});
	});

	test('should return updated data if returnData is set', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
				{ name: 'birthday', type: 'date' },
			],
			data: [
				{ name: 'Alice', age: 30, active: true, birthday: new Date('1990-01-01T00:00:00.000Z') },
				{ name: 'Bob', age: 25, active: true, birthday: new Date('1995-05-15T00:00:00.000Z') },
			],
		});

		const payload = {
			filter: { type: 'and', filters: [{ columnName: 'active', condition: 'eq', value: true }] },
			data: { active: false },
			returnData: true,
		};

		const result = await authMemberAgent
			.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
			.send(payload)
			.expect(200);

		expect(result.body.data).toMatchObject([
			{
				id: 1,
				name: 'Alice',
				age: 30,
				active: false,
				birthday: '1990-01-01T00:00:00.000Z',
			},
			{
				id: 2,
				name: 'Bob',
				age: 25,
				active: false,
				birthday: '1995-05-15T00:00:00.000Z',
			},
		]);
	});

	test.each(['like', 'ilike'])(
		'should auto-wrap %s filters if no wildcard is present',
		async (condition) => {
			const dataTable = await createDataTable(memberProject, {
				columns: [
					{
						name: 'name',
						type: 'string',
					},
				],
				data: [{ name: 'Alice Smith' }, { name: 'Bob Jones' }],
			});

			const payload = {
				filter: { type: 'and', filters: [{ columnName: 'name', value: 'Alice', condition }] },
				data: { name: 'Alice Johnson' },
				returnData: true,
			};

			const result = await authMemberAgent
				.patch(`/projects/${memberProject.id}/data-tables/${dataTable.id}/rows`)
				.send(payload)
				.expect(200);

			expect(result.body.data).toEqual([expect.objectContaining({ name: 'Alice Johnson' })]);
		},
	);
});
