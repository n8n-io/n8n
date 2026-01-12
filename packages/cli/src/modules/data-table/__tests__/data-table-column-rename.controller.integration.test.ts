/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createDataTable } from '@test-integration/db/data-tables';
import { createOwner, createMember, createAdmin } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { DataTableColumnRepository } from '../data-table-column.repository';
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
let dataTableColumnRepository: DataTableColumnRepository;

beforeAll(async () => {
	mockDataTableSizeValidator();

	dataTableColumnRepository = Container.get(DataTableColumnRepository);

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

describe('PATCH /projects/:projectId/data-tables/:dataTableId/columns/:columnId/rename', () => {
	test('should not rename column when project does not exist', async () => {
		const payload = {
			name: 'new_column_name',
		};

		await authOwnerAgent
			.patch(
				'/projects/non-existing-id/data-tables/some-data-table-id/columns/some-column-id/rename',
			)
			.send(payload)
			.expect(404);
	});

	test('should not rename column when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);
		const payload = {
			name: 'new_column_name',
		};

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/non-existing-data-table/columns/some-column-id/rename`,
			)
			.send(payload)
			.expect(404);
	});

	test('should not rename column when column does not exist', async () => {
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
			name: 'new_column_name',
		};

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/non-existing-column-id/rename`,
			)
			.send(payload)
			.expect(404);
	});

	test("should not rename column in another user's personal project data table", async () => {
		const dataTable = await createDataTable(ownerProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${ownerProject.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'new_name' })
			.expect(403);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('test_column');
	});

	test('should not rename column if user has project:viewer role in team project', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'new_name' })
			.expect(403);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('test_column');
	});

	test('should rename column if user has project:editor role in team project', async () => {
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

		await authMemberAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'renamed_column' })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('renamed_column');
	});

	test('should rename column if user has project:admin role in team project', async () => {
		const project = await createTeamProject('test project', owner);
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
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'renamed_column' })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('renamed_column');
	});

	test('should rename column if user is owner in team project', async () => {
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
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'renamed_column' })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('renamed_column');
	});

	test('should rename column in personal project', async () => {
		const dataTable = await createDataTable(memberProject, {
			columns: [
				{
					name: 'test_column',
					type: 'string',
				},
			],
		});

		await authMemberAgent
			.patch(
				`/projects/${memberProject.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'renamed_column' })
			.expect(200);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('renamed_column');
	});

	test('should not rename column to an existing column name', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'first_column',
					type: 'string',
				},
				{
					name: 'second_column',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'second_column' })
			.expect(409);

		const firstColumnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(firstColumnInDb?.name).toBe('first_column');
	});

	test('should not rename column with invalid column name', async () => {
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
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'invalid name with spaces' })
			.expect(400);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('test_column');
	});

	test('should not rename column with empty name', async () => {
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
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: '' })
			.expect(400);

		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('test_column');
	});

	test('should rename column successfully', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			columns: [
				{
					name: 'original_name',
					type: 'string',
				},
			],
		});

		await authOwnerAgent
			.patch(
				`/projects/${project.id}/data-tables/${dataTable.id}/columns/${dataTable.columns[0].id}/rename`,
			)
			.send({ name: 'updated_name' })
			.expect(200);

		// Verify column name changed
		const columnInDb = await dataTableColumnRepository.findOneBy({
			id: dataTable.columns[0].id,
		});
		expect(columnInDb?.name).toBe('updated_name');
	});
});
