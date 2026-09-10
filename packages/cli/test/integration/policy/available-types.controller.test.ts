import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';

import { NodeTypes } from '@/node-types';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const nodeTypes = mockInstance(NodeTypes);

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.NODE_TYPE_POLICIES],
});

let owner: User;
let projectAdmin: User;
let projectEditor: User;
let projectViewer: User;
let otherProjectAdmin: User;
let project: Project;

const availableTypesRoute = (projectId: string) => `/projects/${projectId}/available-types`;
const projectPolicyRoute = (projectId: string) =>
	`/projects/${projectId}/node-type-policies/project`;

const SLACK = 'n8n-nodes-base.slack';
const CODE = 'n8n-nodes-base.code';
const EXECUTE_COMMAND = 'n8n-nodes-base.executeCommand';
const GMAIL = 'n8n-nodes-base.gmail';

const KNOWN_TYPES = [SLACK, CODE, EXECUTE_COMMAND, GMAIL];

const rule = (id: string, action: 'allow' | 'deny' | 'delegate', value: string) => ({
	id,
	action,
	selector: { kind: 'name', value },
});

async function setInstancePolicy(rules: Array<ReturnType<typeof rule>>) {
	const response = await testServer
		.authAgentFor(owner)
		.put('/node-type-policies/instance')
		.send({ rules, defaultAction: 'allow', version: 0 });
	expect(response.statusCode).toBe(200);
}

async function setProjectPolicy(projectId: string, rules: Array<ReturnType<typeof rule>>) {
	const response = await testServer
		.authAgentFor(projectAdmin)
		.put(projectPolicyRoute(projectId))
		.send({ rules, defaultAction: 'allow', version: 0 });
	expect(response.statusCode).toBe(200);
}

beforeAll(async () => {
	owner = await createOwner();
	projectAdmin = await createMember();
	projectEditor = await createMember();
	projectViewer = await createMember();
	otherProjectAdmin = await createMember();

	project = await createTeamProject('Policy project', projectAdmin);
	await createTeamProject('Other project', otherProjectAdmin);
	await linkUserToProject(projectEditor, project, 'project:editor');
	await linkUserToProject(projectViewer, project, 'project:viewer');
});

beforeEach(() => {
	nodeTypes.getKnownTypes.mockReturnValue(
		Object.fromEntries(KNOWN_TYPES.map((name) => [name, { className: name, sourcePath: '' }])),
	);
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

/**
 * Reading effective availability takes project membership only — every member must see what
 * they can use and why, including the roles that cannot author the policy.
 */
describe('available types endpoint RBAC', () => {
	test.each([
		['a project admin', () => projectAdmin],
		['a project editor', () => projectEditor],
		['a project viewer', () => projectViewer],
		['an instance owner without a project role', () => owner],
	])('allows %s', async (_label, user) => {
		const response = await testServer.authAgentFor(user()).get(availableTypesRoute(project.id));

		expect(response.statusCode).toBe(200);
	});

	test('rejects the admin of a different project with 403', async () => {
		const response = await testServer
			.authAgentFor(otherProjectAdmin)
			.get(availableTypesRoute(project.id));

		expect(response.statusCode).toBe(403);
	});

	test('rejects an unauthenticated caller with 401', async () => {
		const response = await testServer.authlessAgent.get(availableTypesRoute(project.id));

		expect(response.statusCode).toBe(401);
	});
});

describe('available types endpoint license gating', () => {
	afterEach(() => {
		testServer.license.enable(LICENSE_FEATURES.NODE_TYPE_POLICIES);
	});

	test('rejects a member with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.NODE_TYPE_POLICIES);

		const response = await testServer
			.authAgentFor(projectEditor)
			.get(availableTypesRoute(project.id));

		expect(response.statusCode).toBe(403);
	});
});

describe('available types endpoint', () => {
	test('reports every known type as available when no policy is configured', async () => {
		const response = await testServer
			.authAgentFor(projectViewer)
			.get(availableTypesRoute(project.id));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual(KNOWN_TYPES.map((name) => ({ name, available: true })));
	});

	test('explains every unavailable type with the scope and rule that denied it', async () => {
		await setInstancePolicy([
			rule('instance-deny', 'deny', EXECUTE_COMMAND),
			rule('instance-delegate', 'delegate', CODE),
		]);
		await setProjectPolicy(project.id, [rule('project-deny', 'deny', SLACK)]);

		const response = await testServer
			.authAgentFor(projectViewer)
			.get(availableTypesRoute(project.id));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual([
			{ name: SLACK, available: false, scope: 'project', matchedRuleId: 'project-deny' },
			{
				name: CODE,
				available: false,
				scope: 'instance',
				matchedRuleId: 'instance-delegate',
				optInAvailable: true,
			},
			{
				name: EXECUTE_COMMAND,
				available: false,
				scope: 'instance',
				matchedRuleId: 'instance-deny',
			},
			{ name: GMAIL, available: true },
		]);
	});

	test('reports a delegated type as available once the project opts in', async () => {
		await setInstancePolicy([rule('instance-delegate', 'delegate', CODE)]);
		await setProjectPolicy(project.id, [rule('project-allow', 'allow', CODE)]);

		const response = await testServer
			.authAgentFor(projectViewer)
			.get(availableTypesRoute(project.id));

		expect(response.body.data).toContainEqual({ name: CODE, available: true });
	});

	test('an instance deny is not opt-in available, even for a project that allows the type', async () => {
		await setInstancePolicy([rule('instance-deny', 'deny', CODE)]);
		await setProjectPolicy(project.id, [rule('project-allow', 'allow', CODE)]);

		const response = await testServer
			.authAgentFor(projectViewer)
			.get(availableTypesRoute(project.id));

		expect(response.body.data).toContainEqual({
			name: CODE,
			available: false,
			scope: 'instance',
			matchedRuleId: 'instance-deny',
		});
	});

	test('applies the instance policy to a personal project, which has no policy of its own', async () => {
		await setInstancePolicy([rule('instance-deny', 'deny', EXECUTE_COMMAND)]);
		const personalProject = await getPersonalProject(projectEditor);

		const response = await testServer
			.authAgentFor(projectEditor)
			.get(availableTypesRoute(personalProject.id));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toContainEqual({
			name: EXECUTE_COMMAND,
			available: false,
			scope: 'instance',
			matchedRuleId: 'instance-deny',
		});
	});

	test('the same type can be available in one project and blocked in another', async () => {
		await setProjectPolicy(project.id, [rule('project-deny', 'deny', SLACK)]);
		const personalProject = await getPersonalProject(projectAdmin);

		const blocked = await testServer
			.authAgentFor(projectAdmin)
			.get(availableTypesRoute(project.id));
		const allowed = await testServer
			.authAgentFor(projectAdmin)
			.get(availableTypesRoute(personalProject.id));

		expect(blocked.body.data).toContainEqual({
			name: SLACK,
			available: false,
			scope: 'project',
			matchedRuleId: 'project-deny',
		});
		expect(allowed.body.data).toContainEqual({ name: SLACK, available: true });
	});
});
