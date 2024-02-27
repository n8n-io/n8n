import type { SuperAgentTest } from 'supertest';
import * as utils from './shared/utils/';
import { createMember } from './shared/db/users';
import type { GlobalRole } from '@/databases/entities/User';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { CredentialSharingRole } from '@/databases/entities/SharedCredentials';
import type { WorkflowSharingRole } from '@/databases/entities/SharedWorkflow';

const testServer = utils.setupTestServer({
	endpointGroups: ['role'],
});

let memberAgent: SuperAgentTest;

const expectedCategories = ['global', 'project', 'credential', 'workflow'] as const;
const expectedGlobalRoles: Array<{ name: string; role: GlobalRole }> = [
	{ name: 'Owner', role: 'global:owner' },
	{ name: 'Admin', role: 'global:admin' },
	{ name: 'Member', role: 'global:member' },
];
const expectedProjectRoles: Array<{ name: string; role: ProjectRole }> = [
	{ name: 'Project Owner', role: 'project:personalOwner' },
	{ name: 'Project Admin', role: 'project:admin' },
	{ name: 'Project Editor', role: 'project:editor' },
	{ name: 'Project Viewer', role: 'project:viewer' },
];
const expectedCredentialRoles: Array<{ name: string; role: CredentialSharingRole }> = [
	{ name: 'Credential Owner', role: 'credential:owner' },
	{ name: 'Credential User', role: 'credential:user' },
];
const expectedWorkflowRoles: Array<{ name: string; role: WorkflowSharingRole }> = [
	{ name: 'Workflow Owner', role: 'workflow:owner' },
	{ name: 'Workflow Editor', role: 'workflow:editor' },
	{ name: 'Workflow User', role: 'workflow:user' },
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
