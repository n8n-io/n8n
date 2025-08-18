import { getRoleScopes } from '@n8n/permissions';
import type {
	GlobalRole,
	ProjectRole,
	CredentialSharingRole,
	WorkflowSharingRole,
	Scope,
} from '@n8n/permissions';

import { createMember } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['role'],
});

let memberAgent: SuperAgentTest;

const expectedCategories = ['global', 'project', 'credential', 'workflow'] as const;
let expectedGlobalRoles: Array<{
	name: string;
	role: GlobalRole;
	scopes: Scope[];
	licensed: boolean;
	description: string;
}>;
let expectedProjectRoles: Array<{
	name: string;
	role: ProjectRole;
	scopes: Scope[];
	licensed: boolean;
	description: string;
}>;
let expectedCredentialRoles: Array<{
	name: string;
	role: CredentialSharingRole;
	scopes: Scope[];
	description: string;
	licensed: boolean;
}>;
let expectedWorkflowRoles: Array<{
	name: string;
	role: WorkflowSharingRole;
	scopes: Scope[];
	licensed: boolean;
	description: string;
}>;

beforeAll(async () => {
	memberAgent = testServer.authAgentFor(await createMember());

	expectedGlobalRoles = [
		{
			name: 'Owner',
			role: 'global:owner',
			scopes: getRoleScopes('global:owner'),
			licensed: true,
			description: 'Owner',
		},
		{
			name: 'Admin',
			role: 'global:admin',
			scopes: getRoleScopes('global:admin'),
			licensed: false,
			description: 'Admin',
		},
		{
			name: 'Member',
			role: 'global:member',
			scopes: getRoleScopes('global:member'),
			licensed: true,
			description: 'Member',
		},
	];
	expectedProjectRoles = [
		{
			name: 'Project Owner',
			role: 'project:personalOwner',
			scopes: getRoleScopes('project:personalOwner'),
			licensed: true,
			description: 'Project Owner',
		},
		{
			name: 'Project Admin',
			role: 'project:admin',
			scopes: getRoleScopes('project:admin'),
			licensed: false,
			description: 'Project Admin',
		},
		{
			name: 'Project Editor',
			role: 'project:editor',
			scopes: getRoleScopes('project:editor'),
			licensed: false,
			description: 'Project Editor',
		},
	];
	expectedCredentialRoles = [
		{
			name: 'Credential Owner',
			role: 'credential:owner',
			scopes: getRoleScopes('credential:owner'),
			licensed: true,
			description: 'Credential Owner',
		},
		{
			name: 'Credential User',
			role: 'credential:user',
			scopes: getRoleScopes('credential:user'),
			licensed: true,
			description: 'Credential User',
		},
	];
	expectedWorkflowRoles = [
		{
			name: 'Workflow Owner',
			role: 'workflow:owner',
			scopes: getRoleScopes('workflow:owner'),
			licensed: true,
			description: 'Workflow Owner',
		},
		{
			name: 'Workflow Editor',
			role: 'workflow:editor',
			scopes: getRoleScopes('workflow:editor'),
			licensed: true,
			description: 'Workflow Editor',
		},
	];
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
