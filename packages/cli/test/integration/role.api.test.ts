import type { SuperAgentTest } from 'supertest';
import * as utils from './shared/utils/';
import { createMember } from './shared/db/users';
import type { GlobalRole } from '@/databases/entities/User';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { CredentialSharingRole } from '@/databases/entities/SharedCredentials';
import type { WorkflowSharingRole } from '@/databases/entities/SharedWorkflow';
import { RoleService } from '@/services/role.service';
import Container from 'typedi';
import type { Scope } from '@n8n/permissions';

const testServer = utils.setupTestServer({
	endpointGroups: ['role'],
});

let memberAgent: SuperAgentTest;

const expectedCategories = ['global', 'project', 'credential', 'workflow'] as const;
const expectedGlobalRoles: Array<{ name: string; role: GlobalRole; scopes: Scope[] }> = [
	{
		name: 'Owner',
		role: 'global:owner',
		scopes: Container.get(RoleService).getRoleScopes('global:owner'),
	},
	{
		name: 'Admin',
		role: 'global:admin',
		scopes: Container.get(RoleService).getRoleScopes('global:admin'),
	},
	{
		name: 'Member',
		role: 'global:member',
		scopes: Container.get(RoleService).getRoleScopes('global:member'),
	},
];
const expectedProjectRoles: Array<{ name: string; role: ProjectRole; scopes: Scope[] }> = [
	{
		name: 'Project Owner',
		role: 'project:personalOwner',
		scopes: Container.get(RoleService).getRoleScopes('project:personalOwner'),
	},
	{
		name: 'Project Admin',
		role: 'project:admin',
		scopes: Container.get(RoleService).getRoleScopes('project:admin'),
	},
	{
		name: 'Project Editor',
		role: 'project:editor',
		scopes: Container.get(RoleService).getRoleScopes('project:editor'),
	},
	{
		name: 'Project Viewer',
		role: 'project:viewer',
		scopes: Container.get(RoleService).getRoleScopes('project:viewer'),
	},
];
const expectedCredentialRoles: Array<{
	name: string;
	role: CredentialSharingRole;
	scopes: Scope[];
}> = [
	{
		name: 'Credential Owner',
		role: 'credential:owner',
		scopes: Container.get(RoleService).getRoleScopes('credential:owner'),
	},
	{
		name: 'Credential User',
		role: 'credential:user',
		scopes: Container.get(RoleService).getRoleScopes('credential:user'),
	},
];
const expectedWorkflowRoles: Array<{ name: string; role: WorkflowSharingRole; scopes: Scope[] }> = [
	{
		name: 'Workflow Owner',
		role: 'workflow:owner',
		scopes: Container.get(RoleService).getRoleScopes('workflow:owner'),
	},
	{
		name: 'Workflow Editor',
		role: 'workflow:editor',
		scopes: Container.get(RoleService).getRoleScopes('workflow:editor'),
	},
	{
		name: 'Workflow User',
		role: 'workflow:user',
		scopes: Container.get(RoleService).getRoleScopes('workflow:user'),
	},
];

beforeAll(async () => {
	memberAgent = testServer.authAgentFor(await createMember());
});

describe('GET /roles/', () => {
	test('should return all role categories', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);

		const data: Record<string, string[]> = resp.body.data;

		const categories = [...Object.keys(data)];
		expect(categories.length).toBe(expectedCategories.length);
		expect(expectedCategories.every((c) => categories.includes(c))).toBe(true);
	});

	test('should return fixed global roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		for (const role of expectedGlobalRoles) {
			expect(resp.body.data.global).toContainEqual(role);
		}
	});

	test('should return fixed project roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		for (const role of expectedProjectRoles) {
			expect(resp.body.data.project).toContainEqual(role);
		}
	});

	test('should return fixed credential sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		for (const role of expectedCredentialRoles) {
			expect(resp.body.data.credential).toContainEqual(role);
		}
	});

	test('should return fixed workflow sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);
		for (const role of expectedWorkflowRoles) {
			expect(resp.body.data.workflow).toContainEqual(role);
		}
	});
});
