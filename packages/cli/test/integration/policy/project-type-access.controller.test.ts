import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { PolicyRule } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { HiddenNodeTypes } from '@/modules/type-availability-policies/hidden-node-types';
import { NodeTypes } from '@/node-types';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const nodeTypes = mockInstance(NodeTypes);
const hiddenNodeTypes = mockInstance(HiddenNodeTypes);

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const NODE_KIND_ROUTE = 'node-type-policies';
const CREDENTIAL_KIND_ROUTE = 'credential-type-policies';

const SLACK = 'n8n-nodes-base.slack';
const NOTION = 'n8n-nodes-base.notion';
const GMAIL = 'n8n-nodes-base.gmail';

const KNOWN_CREDENTIALS = {
	notionApi: { className: 'notionApi', sourcePath: '' },
	slackApi: { className: 'slackApi', sourcePath: '' },
};

let owner: User;
let projectAdmin: User;
let projectEditor: User;
let otherProjectAdmin: User;
let project: Project;

const accessRoute = (kindRoute: string, projectId: string) =>
	`/projects/${projectId}/${kindRoute}/project/access`;

const knownTypes = (names: string[]) =>
	Object.fromEntries(names.map((name) => [name, { className: name, sourcePath: '' }]));

const rule = (id: string, action: PolicyRule['action'], value: string): PolicyRule => ({
	id,
	action,
	selector: { kind: 'name', value },
});

async function putInstancePolicy(kindRoute: string, rules: PolicyRule[]) {
	const response = await testServer
		.authAgentFor(owner)
		.put(`/${kindRoute}/instance`)
		.send({ rules, defaultAction: 'allow', version: 0 });
	expect(response.statusCode).toBe(200);
}

async function putProjectPolicy(kindRoute: string, rules: PolicyRule[], version = 0) {
	return await testServer
		.authAgentFor(projectAdmin)
		.put(`/projects/${project.id}/${kindRoute}/project`)
		.send({ rules, defaultAction: 'allow', version });
}

async function readAccess(kindRoute: string, user = projectAdmin, projectId = project.id) {
	return await testServer.authAgentFor(user).get(accessRoute(kindRoute, projectId));
}

beforeAll(async () => {
	owner = await createOwner();
	projectAdmin = await createMember();
	projectEditor = await createMember();
	otherProjectAdmin = await createMember();

	project = await createTeamProject('Policy project', projectAdmin);
	await createTeamProject('Other project', otherProjectAdmin);
	await linkUserToProject(projectEditor, project, 'project:editor');

	Object.defineProperty(Container.get(LoadNodesAndCredentials), 'knownCredentials', {
		configurable: true,
		value: KNOWN_CREDENTIALS,
	});
});

afterAll(() => {
	delete (Container.get(LoadNodesAndCredentials) as { knownCredentials?: unknown })
		.knownCredentials;
});

beforeEach(() => {
	hiddenNodeTypes.get.mockResolvedValue(new Set());
	nodeTypes.getKnownTypes.mockReturnValue(knownTypes([SLACK, NOTION, GMAIL]));
	nodeTypes.resolveBaseName.mockImplementation((name) => ({
		baseName: name,
		isSyntheticTool: false,
	}));
});

afterEach(async () => {
	testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

describe('GET /projects/:projectId/<kind>/project/access gating', () => {
	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s rejects a project editor with 403',
		async (kindRoute) => {
			expect((await readAccess(kindRoute, projectEditor)).statusCode).toBe(403);
		},
	);

	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s rejects the admin of a different project with 403',
		async (kindRoute) => {
			expect((await readAccess(kindRoute, otherProjectAdmin)).statusCode).toBe(403);
		},
	);

	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s rejects the owner of a personal project with 403 for that project',
		async (kindRoute) => {
			const personalProject = await getPersonalProject(projectEditor);

			const response = await readAccess(kindRoute, projectEditor, personalProject.id);

			expect(response.statusCode).toBe(403);
		},
	);

	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s rejects a project admin with 403 when the license feature is disabled',
		async (kindRoute) => {
			testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

			expect((await readAccess(kindRoute)).statusCode).toBe(403);
		},
	);

	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s returns 404 to an owner for a project that does not exist',
		async (kindRoute) => {
			const response = await readAccess(kindRoute, owner, 'does-not-exist');

			expect(response.statusCode).toBe(404);
		},
	);

	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s reads a personal project for an owner, with project version 0',
		async (kindRoute) => {
			const personalProject = await getPersonalProject(projectEditor);

			const response = await readAccess(kindRoute, owner, personalProject.id);

			expect(response.statusCode).toBe(200);
			expect(response.body.data.projectVersion).toBe(0);
		},
	);

	test.each([NODE_KIND_ROUTE, CREDENTIAL_KIND_ROUTE])(
		'%s returns 403, not 404, to a project admin for a project that does not exist',
		async (kindRoute) => {
			expect((await readAccess(kindRoute, projectAdmin, 'does-not-exist')).statusCode).toBe(403);
		},
	);

	test('an owner without a project role can read the project', async () => {
		expect((await readAccess(NODE_KIND_ROUTE, owner)).statusCode).toBe(200);
	});
});

describe('GET /projects/:projectId/node-type-policies/project/access', () => {
	test('reports who sets the access of each type, and both versions', async () => {
		await putInstancePolicy(NODE_KIND_ROUTE, [
			rule('deny-slack', 'deny', SLACK),
			rule('delegate-notion', 'delegate', NOTION),
		]);
		expect(
			(await putProjectPolicy(NODE_KIND_ROUTE, [rule('allow-notion', 'allow', NOTION)])).statusCode,
		).toBe(200);

		const response = await readAccess(NODE_KIND_ROUTE);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			instanceVersion: 1,
			projectVersion: 1,
			types: [
				{
					name: SLACK,
					access: 'deny',
					scope: 'instance',
					matchedRuleId: 'deny-slack',
					optInAvailable: false,
				},
				{
					name: NOTION,
					access: 'allow',
					scope: 'project',
					matchedRuleId: 'allow-notion',
					optInAvailable: false,
				},
				{
					name: GMAIL,
					access: 'allow',
					scope: 'instance',
					matchedRuleId: null,
					optInAvailable: false,
				},
			],
		});
	});

	test('reports a delegated type without an opt-in as restricted by the instance, with opt-in available', async () => {
		await putInstancePolicy(NODE_KIND_ROUTE, [rule('delegate-notion', 'delegate', NOTION)]);

		const response = await readAccess(NODE_KIND_ROUTE);

		expect(response.body.data.projectVersion).toBe(0);
		expect(response.body.data.types).toContainEqual({
			name: NOTION,
			access: 'deny',
			scope: 'instance',
			matchedRuleId: 'delegate-notion',
			optInAvailable: true,
		});
	});

	test('reports a project version that a project write accepts', async () => {
		await putProjectPolicy(NODE_KIND_ROUTE, [rule('deny-gmail', 'deny', GMAIL)]);
		const { projectVersion } = (await readAccess(NODE_KIND_ROUTE)).body.data;

		const response = await putProjectPolicy(NODE_KIND_ROUTE, [], projectVersion);

		expect(response.statusCode).toBe(200);
	});

	test('leaves out a hidden node type that no instance rule names', async () => {
		hiddenNodeTypes.get.mockResolvedValue(new Set([GMAIL]));

		const response = await readAccess(NODE_KIND_ROUTE);

		expect(response.body.data.types.map((type: { name: string }) => type.name)).toEqual([
			SLACK,
			NOTION,
		]);
	});

	describe('rows that only a rule makes visible', () => {
		const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';
		const names = (response: { body: { data: { types: Array<{ name: string }> } } }) =>
			response.body.data.types.map((type) => type.name);

		beforeEach(() => {
			nodeTypes.getKnownTypes.mockReturnValue(knownTypes([SLACK, NOTION, GMAIL, GMAIL_TOOL]));
			nodeTypes.resolveBaseName.mockImplementation((name) => ({
				baseName: name === GMAIL_TOOL ? GMAIL : name,
				isSyntheticTool: name === GMAIL_TOOL,
			}));
		});

		test('a project rule keeps the row of a generated tool variant', async () => {
			await putProjectPolicy(NODE_KIND_ROUTE, [rule('deny-gmail-tool', 'deny', GMAIL_TOOL)]);

			const response = await readAccess(NODE_KIND_ROUTE);

			expect(response.body.data.types).toContainEqual({
				name: GMAIL_TOOL,
				access: 'deny',
				scope: 'project',
				matchedRuleId: 'deny-gmail-tool',
				optInAvailable: false,
			});
		});

		test('a project rule that decides a tool variant and its base adds no row for the variant', async () => {
			await putProjectPolicy(NODE_KIND_ROUTE, [
				{
					id: 'deny-base-nodes',
					action: 'deny',
					selector: { kind: 'package', value: 'n8n-nodes-base' },
				},
			]);

			expect(names(await readAccess(NODE_KIND_ROUTE))).toEqual([SLACK, NOTION, GMAIL]);
		});

		test('an instance rule keeps the row of a generated tool variant', async () => {
			await putInstancePolicy(NODE_KIND_ROUTE, [rule('deny-gmail-tool', 'deny', GMAIL_TOOL)]);

			const response = await readAccess(NODE_KIND_ROUTE);

			expect(response.body.data.types).toContainEqual({
				name: GMAIL_TOOL,
				access: 'deny',
				scope: 'instance',
				matchedRuleId: 'deny-gmail-tool',
				optInAvailable: false,
			});
		});

		test('a project name rule keeps the row of a hidden type', async () => {
			hiddenNodeTypes.get.mockResolvedValue(new Set([GMAIL]));
			await putProjectPolicy(NODE_KIND_ROUTE, [rule('deny-gmail', 'deny', GMAIL)]);

			const response = await readAccess(NODE_KIND_ROUTE);

			expect(response.body.data.types).toContainEqual({
				name: GMAIL,
				access: 'deny',
				scope: 'project',
				matchedRuleId: 'deny-gmail',
				optInAvailable: false,
			});
		});

		test('a project name rule with the id of an instance rule adds no row for a hidden type', async () => {
			hiddenNodeTypes.get.mockResolvedValue(new Set([GMAIL]));
			await putInstancePolicy(NODE_KIND_ROUTE, [
				{
					id: 'shared-id',
					action: 'allow',
					selector: { kind: 'package', value: 'n8n-nodes-base' },
				},
			]);
			await putProjectPolicy(NODE_KIND_ROUTE, [rule('shared-id', 'allow', SLACK)]);

			expect(names(await readAccess(NODE_KIND_ROUTE))).toEqual([SLACK, NOTION]);
		});

		test('an instance name rule keeps the row of a hidden type', async () => {
			hiddenNodeTypes.get.mockResolvedValue(new Set([GMAIL]));
			await putInstancePolicy(NODE_KIND_ROUTE, [rule('deny-gmail', 'deny', GMAIL)]);

			const response = await readAccess(NODE_KIND_ROUTE);

			expect(response.body.data.types).toContainEqual({
				name: GMAIL,
				access: 'deny',
				scope: 'instance',
				matchedRuleId: 'deny-gmail',
				optInAvailable: false,
			});
		});
	});
});

describe('GET /projects/:projectId/credential-type-policies/project/access', () => {
	test('reads the credential type policies, not the node type policies', async () => {
		await putInstancePolicy(NODE_KIND_ROUTE, [rule('deny-slack-node', 'deny', SLACK)]);
		await putInstancePolicy(CREDENTIAL_KIND_ROUTE, [
			rule('delegate-notion', 'delegate', 'notionApi'),
		]);
		expect(
			(await putProjectPolicy(CREDENTIAL_KIND_ROUTE, [rule('allow-notion', 'allow', 'notionApi')]))
				.statusCode,
		).toBe(200);

		const response = await readAccess(CREDENTIAL_KIND_ROUTE);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			instanceVersion: 1,
			projectVersion: 1,
			types: [
				{
					name: 'notionApi',
					access: 'allow',
					scope: 'project',
					matchedRuleId: 'allow-notion',
					optInAvailable: false,
				},
				{
					name: 'slackApi',
					access: 'allow',
					scope: 'instance',
					matchedRuleId: null,
					optInAvailable: false,
				},
			],
		});
	});
});
