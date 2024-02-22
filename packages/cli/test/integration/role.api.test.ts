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
const expectedGlobalRoles: GlobalRole[] = ['global:owner', 'global:admin', 'global:member'];
const expectedProjectRoles: ProjectRole[] = [
	'project:personalOwner',
	'project:admin',
	'project:editor',
	'project:viewer',
];
const expectedCredentialRoles: CredentialSharingRole[] = ['credential:owner', 'credential:user'];
const expectedWorkflowRoles: WorkflowSharingRole[] = [
	'workflow:owner',
	'workflow:editor',
	'workflow:user',
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

		const roles: GlobalRole[] = resp.body.data.global;
		expect(roles.length).toBe(expectedGlobalRoles.length);
		expect(expectedGlobalRoles.every((r) => roles.includes(r))).toBe(true);
	});

	test('should return fixed project roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);

		const roles: ProjectRole[] = resp.body.data.project;
		expect(roles.length).toBe(expectedProjectRoles.length);
		expect(expectedProjectRoles.every((r) => roles.includes(r))).toBe(true);
	});

	test('should return fixed credential sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);

		const roles: CredentialSharingRole[] = resp.body.data.credential;
		expect(roles.length).toBe(expectedCredentialRoles.length);
		expect(expectedCredentialRoles.every((r) => roles.includes(r))).toBe(true);
	});

	test('should return fixed workflow sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');

		expect(resp.status).toBe(200);

		const roles: WorkflowSharingRole[] = resp.body.data.workflow;
		expect(roles.length).toBe(expectedWorkflowRoles.length);
		expect(expectedWorkflowRoles.every((r) => roles.includes(r))).toBe(true);
	});
});
