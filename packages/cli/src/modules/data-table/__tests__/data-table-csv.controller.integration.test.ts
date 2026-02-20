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
import { createOwner, createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { DataTableColumnRepository } from '../data-table-column.repository';
import { DataTableRowsRepository } from '../data-table-rows.repository';
import { mockDataTableSizeValidator } from './test-helpers';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;
let memberProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['data-table'],
	modules: ['data-table'],
});
let dataTableColumnRepository: DataTableColumnRepository;
let dataTableRowsRepository: DataTableRowsRepository;

beforeAll(async () => {
	mockDataTableSizeValidator();

	dataTableColumnRepository = Container.get(DataTableColumnRepository);
	dataTableRowsRepository = Container.get(DataTableRowsRepository);

	owner = await createOwner();
	member = await createMember();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
	memberProject = await getPersonalProject(member);
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

describe('GET /projects/:projectId/data-tables/:dataTableId/download-csv', () => {
	test('should not download CSV when project does not exist', async () => {
		await authOwnerAgent
			.get('/projects/non-existing-id/data-tables/some-data-table-id/download-csv')
			.expect(404);
	});

	test('should not download CSV when data table does not exist', async () => {
		const project = await createTeamProject('test project', owner);

		await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/non-existing-id/download-csv`)
			.expect(404);
	});

	test('should not download CSV if user has no access to project', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Test Data Table',
			columns: [{ name: 'test_column', type: 'string' }],
		});

		await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(403);
	});

	test("should not download CSV from another user's personal project", async () => {
		const dataTable = await createDataTable(ownerProject, {
			name: 'Personal Data Table',
			columns: [{ name: 'test_column', type: 'string' }],
		});

		await authMemberAgent
			.get(`/projects/${ownerProject.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(403);
	});

	test('should download CSV with headers only for empty table', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Empty Table',
			columns: [
				{ name: 'firstName', type: 'string' },
				{ name: 'age', type: 'number' },
			],
		});

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		expect(response.body.data.dataTableName).toBe('Empty Table');
		expect(response.body.data.csvContent).toBe('id,firstName,age,createdAt,updatedAt');
	});

	test('should download CSV with data rows', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'People',
			columns: [
				{ name: 'name', type: 'string' },
				{ name: 'age', type: 'number' },
			],
		});

		// Get columns for insertRows
		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		// Insert rows
		await dataTableRowsRepository.insertRows(
			dataTable.id,
			[
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			],
			columns,
			'id',
		);

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		expect(response.body.data.dataTableName).toBe('People');

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// Check header
		expect(lines[0]).toBe('id,name,age,createdAt,updatedAt');

		// Check data rows exist
		expect(lines.length).toBe(3); // header + 2 rows
		expect(csvContent).toContain('Alice');
		expect(csvContent).toContain('Bob');
		expect(csvContent).toContain('30');
		expect(csvContent).toContain('25');
	});

	test('should properly escape special characters in CSV', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Special Chars',
			columns: [{ name: 'description', type: 'string' }],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		// Insert rows with special characters
		await dataTableRowsRepository.insertRows(
			dataTable.id,
			[
				{ description: 'Contains "quotes"' },
				{ description: 'Contains, commas' },
				{ description: 'Contains\nnewlines' },
				{ description: '  leading and trailing  ' },
			],
			columns,
			'id',
		);

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		const csvContent = response.body.data.csvContent;

		// Check proper escaping
		expect(csvContent).toContain('"Contains ""quotes"""'); // Quotes doubled and wrapped
		expect(csvContent).toContain('"Contains, commas"'); // Wrapped due to comma
		expect(csvContent).toContain('"Contains\nnewlines"'); // Wrapped due to newline
		expect(csvContent).toContain('"  leading and trailing  "'); // Wrapped due to spaces
	});

	test('should handle different data types in CSV', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Mixed Types',
			columns: [
				{ name: 'text', type: 'string' },
				{ name: 'number', type: 'number' },
				{ name: 'flag', type: 'boolean' },
				{ name: 'timestamp', type: 'date' },
			],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);
		const testDate = new Date('2025-01-15T10:30:00.000Z');
		await dataTableRowsRepository.insertRows(
			dataTable.id,
			[
				{
					text: 'hello',
					number: 42,
					flag: true,
					timestamp: testDate,
				},
			],
			columns,
			'id',
		);

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		expect(lines[0]).toBe('id,text,number,flag,timestamp,createdAt,updatedAt');
		expect(lines[1]).toContain('hello');
		expect(lines[1]).toContain('42');
		// Boolean values vary by database: SQLite use 0/1, PostgreSQL uses true/false
		expect(lines[1]).toMatch(/,(true|1),/);
		// Check for date in ISO format (timezone may vary)
		expect(lines[1]).toMatch(/2025-01-15T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
	});

	test('should handle null values in CSV', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Nullable Fields',
			columns: [
				{ name: 'required', type: 'string' },
				{ name: 'optional', type: 'string' },
			],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		await dataTableRowsRepository.insertRows(
			dataTable.id,
			[{ required: 'value', optional: null }],
			columns,
			'id',
		);

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// Null should be represented as empty field
		expect(lines[1]).toMatch(/,value,,/); // Empty field for null value
	});

	test('should download CSV with correct column order', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Ordered Columns',
			columns: [
				{ name: 'third', type: 'string' },
				{ name: 'first', type: 'string' },
				{ name: 'second', type: 'string' },
			],
		});

		// Reorder columns
		const columns = await dataTableColumnRepository.getColumns(dataTable.id);
		const thirdCol = columns.find((c) => c.name === 'third');
		const firstCol = columns.find((c) => c.name === 'first');
		const secondCol = columns.find((c) => c.name === 'second');

		if (thirdCol && firstCol && secondCol) {
			await dataTableColumnRepository.update(firstCol.id, { index: 0 });
			await dataTableColumnRepository.update(secondCol.id, { index: 1 });
			await dataTableColumnRepository.update(thirdCol.id, { index: 2 });
		}

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// Columns should be ordered by index
		expect(lines[0]).toBe('id,first,second,third,createdAt,updatedAt');
	});

	test('should allow CSV download if user has project:viewer role', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:viewer');
		const dataTable = await createDataTable(project, {
			name: 'Viewable Table',
			columns: [{ name: 'data', type: 'string' }],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		expect(response.body.data.dataTableName).toBe('Viewable Table');
		expect(response.body.data.csvContent).toContain('id,data,createdAt,updatedAt');
	});

	test('should allow CSV download if user has project:editor role', async () => {
		const project = await createTeamProject('test project', owner);
		await linkUserToProject(member, project, 'project:editor');
		const dataTable = await createDataTable(project, {
			name: 'Editable Table',
			columns: [{ name: 'data', type: 'string' }],
		});

		const response = await authMemberAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		expect(response.body.data.dataTableName).toBe('Editable Table');
		expect(response.body.data.csvContent).toContain('id,data,createdAt,updatedAt');
	});

	test('should download CSV from personal project data table', async () => {
		const dataTable = await createDataTable(memberProject, {
			name: 'Personal CSV Export',
			columns: [{ name: 'info', type: 'string' }],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);

		await dataTableRowsRepository.insertRows(
			dataTable.id,
			[{ info: 'personal data' }],
			columns,
			'id',
		);

		const response = await authMemberAgent
			.get(`/projects/${memberProject.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		expect(response.body.data.dataTableName).toBe('Personal CSV Export');
		expect(response.body.data.csvContent).toContain('personal data');
	});

	test('should handle table name with special characters', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Table "With" Special, Chars',
			columns: [{ name: 'data', type: 'string' }],
		});

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		// Table name should be returned correctly
		expect(response.body.data.dataTableName).toBe('Table "With" Special, Chars');
	});

	test('should handle column names with underscores and numbers', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Valid Column Names',
			columns: [
				{ name: 'first_name', type: 'string' },
				{ name: 'age_2', type: 'string' },
				{ name: 'email_address', type: 'string' },
			],
		});

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// Column names should be included in header
		expect(lines[0]).toContain('first_name');
		expect(lines[0]).toContain('age_2');
		expect(lines[0]).toContain('email_address');
	});

	test('should include system columns by default', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Default Behavior',
			columns: [{ name: 'data', type: 'string' }],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);
		await dataTableRowsRepository.insertRows(dataTable.id, [{ data: 'test' }], columns, 'id');

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${dataTable.id}/download-csv`)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// System columns should be included by default
		expect(lines[0]).toBe('id,data,createdAt,updatedAt');
		expect(lines[1]).toMatch(/^\d+,test,/); // id,data,createdAt,...
	});

	test('should include system columns when includeSystemColumns=true', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'With System Columns',
			columns: [{ name: 'name', type: 'string' }],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);
		await dataTableRowsRepository.insertRows(dataTable.id, [{ name: 'Alice' }], columns, 'id');

		const response = await authOwnerAgent
			.get(
				`/projects/${project.id}/data-tables/${dataTable.id}/download-csv?includeSystemColumns=true`,
			)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// System columns should be present
		expect(lines[0]).toBe('id,name,createdAt,updatedAt');
		expect(lines[1]).toMatch(/^\d+,Alice,/);
		expect(lines[1].split(',').length).toBe(4); // id, name, createdAt, updatedAt
	});

	test('should exclude system columns when includeSystemColumns=false', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Without System Columns',
			columns: [
				{ name: 'firstName', type: 'string' },
				{ name: 'age', type: 'number' },
			],
		});

		const columns = await dataTableColumnRepository.getColumns(dataTable.id);
		await dataTableRowsRepository.insertRows(
			dataTable.id,
			[
				{ firstName: 'Alice', age: 30 },
				{ firstName: 'Bob', age: 25 },
			],
			columns,
			'id',
		);

		const response = await authOwnerAgent
			.get(
				`/projects/${project.id}/data-tables/${dataTable.id}/download-csv?includeSystemColumns=false`,
			)
			.expect(200);

		const csvContent = response.body.data.csvContent;
		const lines = csvContent.split('\n');

		// System columns should NOT be present
		expect(lines[0]).toBe('firstName,age');
		expect(lines[0]).not.toContain('id');
		expect(lines[0]).not.toContain('createdAt');
		expect(lines[0]).not.toContain('updatedAt');

		// Data rows should only contain user columns
		expect(lines[1]).toBe('Alice,30');
		expect(lines[2]).toBe('Bob,25');
		expect(lines[1].split(',').length).toBe(2); // Only firstName and age
	});

	test('should exclude system columns from empty table when includeSystemColumns=false', async () => {
		const project = await createTeamProject('test project', owner);
		const dataTable = await createDataTable(project, {
			name: 'Empty Without System',
			columns: [
				{ name: 'field1', type: 'string' },
				{ name: 'field2', type: 'string' },
			],
		});

		const response = await authOwnerAgent
			.get(
				`/projects/${project.id}/data-tables/${dataTable.id}/download-csv?includeSystemColumns=false`,
			)
			.expect(200);

		const csvContent = response.body.data.csvContent;

		// Only user columns in header, no system columns
		expect(csvContent).toBe('field1,field2');
		expect(csvContent).not.toContain('id');
		expect(csvContent).not.toContain('createdAt');
		expect(csvContent).not.toContain('updatedAt');
	});
});
