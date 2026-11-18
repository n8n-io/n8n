import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataTableRepository } from '@n8n/backend-module-data-table';
import { mockDataTableSizeValidator } from '@n8n/backend-module-data-table/testing';
import { createDataTable } from '@test-integration/db/data-tables';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['data-table'],
	modules: ['data-table'],
});

const rule = { column: 'owner', match: 'id', runsWithoutUser: 'deny' };

beforeAll(async () => {
	mockDataTableSizeValidator();
	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	await testDb.truncate(['DataTable', 'DataTableColumn']);
});

describe('PATCH /projects/:projectId/data-tables/:dataTableId/row-rule', () => {
	test('stores the rule', async () => {
		const project = await createTeamProject(undefined, owner);
		const table = await createDataTable(project, {
			columns: [{ name: 'owner', type: 'string' }],
		});

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${table.id}/row-rule`)
			.send({ rowRule: rule })
			.expect(200);

		const stored = await Container.get(DataTableRepository).findOneBy({ id: table.id });
		expect(stored?.rowRule).toEqual(rule);
	});

	test('refuses a column that is not text', async () => {
		const project = await createTeamProject(undefined, owner);
		const table = await createDataTable(project, {
			columns: [{ name: 'owner', type: 'number' }],
		});

		await authOwnerAgent
			.patch(`/projects/${project.id}/data-tables/${table.id}/row-rule`)
			.send({ rowRule: rule })
			.expect(400);
	});

	test('refuses a project viewer', async () => {
		const project = await createTeamProject(undefined, owner);
		await linkUserToProject(member, project, 'project:viewer');
		const table = await createDataTable(project, {
			columns: [{ name: 'owner', type: 'string' }],
		});

		await authMemberAgent
			.patch(`/projects/${project.id}/data-tables/${table.id}/row-rule`)
			.send({ rowRule: rule })
			.expect(403);
	});
});

describe('GET /projects/:projectId/data-tables/:dataTableId/row-rule/impact', () => {
	test('returns no workflows for an unused table', async () => {
		const project = await createTeamProject(undefined, owner);
		const table = await createDataTable(project);

		const response = await authOwnerAgent
			.get(`/projects/${project.id}/data-tables/${table.id}/row-rule/impact`)
			.expect(200);

		expect(response.body.data).toEqual({ workflowsWithoutUser: [] });
	});
});
