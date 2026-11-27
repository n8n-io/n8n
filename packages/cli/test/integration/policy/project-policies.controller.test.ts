import type { ProjectPoliciesResponse, ProjectPolicySummary } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	CREDENTIAL_TYPES_KIND,
	NODE_TYPES_KIND,
} from '@/modules/type-availability-policies/constants';
import { TypeAvailabilityPolicyScopeRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy-scope.repository';
import { HiddenNodeTypes } from '@/modules/type-availability-policies/hidden-node-types';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';
import { NodeTypes } from '@/node-types';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner, createUser } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const nodeTypes = mockInstance(NodeTypes);
const hiddenNodeTypes = mockInstance(HiddenNodeTypes);

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const SLACK = 'n8n-nodes-base.slack';
const NOTION = 'n8n-nodes-base.notion';
const GMAIL = 'n8n-nodes-base.gmail';
const JIRA = 'n8n-nodes-base.jira';
const HIDDEN = 'n8n-nodes-base.hiddenHelper';

const KNOWN_CREDENTIALS = {
	slackApi: { className: 'slackApi', sourcePath: '' },
	notionApi: { className: 'notionApi', sourcePath: '' },
};

const deny = (id: string, value: string) => ({
	id,
	action: 'deny',
	selector: { kind: 'name', value },
});

let owner: User;
let member: User;

const knownTypes = (names: string[]) =>
	Object.fromEntries(names.map((name) => [name, { className: name, sourcePath: '' }]));

async function putProjectPolicy(
	kind: 'node' | 'credential',
	projectId: string,
	rules: unknown[],
	version = 0,
) {
	const response = await testServer
		.authAgentFor(owner)
		.put(`/projects/${projectId}/${kind}-type-policies/project`)
		.send({ rules, defaultAction: 'allow', version });
	expect(response.statusCode).toBe(200);
	return response.body.data as { scopeId: string; version: number };
}

async function listProjectPolicies(user = owner) {
	const response = await testServer.authAgentFor(user).get('/project-policies');
	expect(response.statusCode).toBe(200);
	return (response.body.data as ProjectPoliciesResponse).projects;
}

function createProjectPolicy(projectId: string, user = owner) {
	return testServer.authAgentFor(user).post('/project-policies').send({ projectId });
}

const scopeOf = async (kind: string, projectId: string) =>
	await Container.get(TypeAvailabilityPolicyScopeRepository).findScopeByKindAndProject(
		kind,
		projectId,
		{},
	);

const BOTH_KINDS = [NODE_TYPES_KIND, CREDENTIAL_TYPES_KIND];

async function expectNoProjectPolicy(projectId: string) {
	for (const kind of BOTH_KINDS) {
		expect(await scopeOf(kind, projectId)).toBeNull();
	}
}

const entryFor = (projects: ProjectPolicySummary[], projectId: string) =>
	projects.find((project) => project.projectId === projectId);

async function setUpdatedAt(scopeId: string, isoDate: string) {
	await Container.get(TypeAvailabilityPolicyScopeRepository).update(
		{ id: scopeId },
		{ updatedAt: new Date(isoDate) },
	);
}

/** SQLite stores `updatedAt` to the second, so an edit must start from a clearly older value. */
const PAST = '2020-01-01T00:00:00.000Z';

async function expectUpdatedSincePast(projectId: string) {
	const updatedAt = entryFor(await listProjectPolicies(), projectId)?.updatedAt;
	expect(new Date(updatedAt ?? 0).getTime()).toBeGreaterThan(new Date(PAST).getTime());
}

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();

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
	nodeTypes.getKnownTypes.mockReturnValue(knownTypes([SLACK, NOTION, GMAIL, JIRA, HIDDEN]));
	nodeTypes.resolveBaseName.mockImplementation((name) => ({
		baseName: name,
		isSyntheticTool: false,
	}));
	hiddenNodeTypes.get.mockResolvedValue(new Set([HIDDEN]));
});

afterEach(async () => {
	vi.restoreAllMocks();
	testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

describe('GET /project-policies access', () => {
	test('rejects a member with 403', async () => {
		const response = await testServer.authAgentFor(member).get('/project-policies');

		expect(response.statusCode).toBe(403);
	});

	test.each(['nodeTypePolicy:manage', 'credentialTypePolicy:manage'])(
		'rejects a user who has only %s with 403',
		async (scope) => {
			const role = await createCustomRoleWithScopeSlugs([scope], { roleType: 'global' });
			const user = await createUser({ role });

			const response = await testServer.authAgentFor(user).get('/project-policies');

			expect(response.statusCode).toBe(403);
		},
	);

	test('accepts a user who has both scopes', async () => {
		const role = await createCustomRoleWithScopeSlugs(
			['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
			{ roleType: 'global' },
		);
		const user = await createUser({ role });

		await listProjectPolicies(user);
	});

	test('rejects an owner with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

		const response = await testServer.authAgentFor(owner).get('/project-policies');

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /project-policies', () => {
	test('lists every team project, with its policy state, and no personal project', async () => {
		const withNodePolicy = await createTeamProject('Node policy', member);
		const withCredentialPolicy = await createTeamProject('Credential policy');
		const withoutPolicy = await createTeamProject('No policy');
		await linkUserToProject(owner, withNodePolicy, 'project:editor');
		const personal = await getPersonalProject(owner);

		await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [deny('i1', SLACK)], defaultAction: 'allow', version: 0 })
			.expect(200);
		await putProjectPolicy('node', withNodePolicy.id, [deny('p1', NOTION), deny('p2', GMAIL)]);
		await putProjectPolicy('credential', withCredentialPolicy.id, [deny('c1', 'slackApi')]);
		await putProjectPolicy('node', personal.id, [deny('p3', NOTION)]);

		const projects = await listProjectPolicies();

		const projectIds = projects.map((project) => project.projectId);
		expect(projectIds).toEqual(
			expect.arrayContaining([withNodePolicy.id, withCredentialPolicy.id, withoutPolicy.id]),
		);
		expect(projectIds).not.toContain(personal.id);

		const instanceNodeTotals = { allowed: 3, restricted: 1 };
		const instanceCredentialTotals = { allowed: 2, restricted: 0 };

		expect(entryFor(projects, withNodePolicy.id)).toMatchObject({
			name: 'Node policy',
			memberCount: 2,
			hasPolicy: true,
			node: { restricted: 2, optedIn: 0, effective: { allowed: 1, restricted: 3 } },
			credential: { restricted: 0, optedIn: 0, effective: instanceCredentialTotals },
		});

		expect(entryFor(projects, withCredentialPolicy.id)).toMatchObject({
			memberCount: 0,
			hasPolicy: true,
			node: { restricted: 0, effective: instanceNodeTotals },
			credential: { restricted: 1, effective: { allowed: 1, restricted: 1 } },
		});

		expect(entryFor(projects, withoutPolicy.id)).toEqual({
			projectId: withoutPolicy.id,
			name: 'No policy',
			icon: null,
			memberCount: 0,
			hasPolicy: false,
			updatedAt: null,
			node: { restricted: 0, optedIn: 0, effective: instanceNodeTotals },
			credential: { restricted: 0, optedIn: 0, effective: instanceCredentialTotals },
		});
	});

	test('reports the later updatedAt of the two kinds', async () => {
		const project = await createTeamProject('Both kinds');
		const node = await putProjectPolicy('node', project.id, [deny('p1', NOTION)]);
		const credential = await putProjectPolicy('credential', project.id, [deny('c1', 'slackApi')]);
		const updatedAtOf = async () => entryFor(await listProjectPolicies(), project.id)?.updatedAt;

		await setUpdatedAt(node.scopeId, PAST);
		await setUpdatedAt(credential.scopeId, '2021-01-01T00:00:00.000Z');
		expect(await updatedAtOf()).toBe('2021-01-01T00:00:00.000Z');

		await setUpdatedAt(node.scopeId, '2022-01-01T00:00:00.000Z');
		expect(await updatedAtOf()).toBe('2022-01-01T00:00:00.000Z');
	});

	test('keeps hasPolicy when a project policy is reset to allow everything', async () => {
		const project = await createTeamProject('Reset');
		const { version } = await putProjectPolicy('node', project.id, [deny('p1', NOTION)]);

		await putProjectPolicy('node', project.id, [], version);

		expect(entryFor(await listProjectPolicies(), project.id)).toMatchObject({
			hasPolicy: true,
			updatedAt: expect.any(String),
			node: { restricted: 0, optedIn: 0, effective: { allowed: 4, restricted: 0 } },
		});
	});

	test('moves updatedAt when only the rules of a project policy change', async () => {
		const project = await createTeamProject('Rules only');
		const { scopeId, version } = await putProjectPolicy('node', project.id, [deny('p1', NOTION)]);
		await setUpdatedAt(scopeId, PAST);

		await putProjectPolicy('node', project.id, [deny('p1', GMAIL)], version);

		await expectUpdatedSincePast(project.id);
	});

	test('moves updatedAt when a document attached to the project policy changes', async () => {
		const project = await createTeamProject('Shared document');
		const { scopeId } = await putProjectPolicy('node', project.id, [deny('p1', NOTION)]);
		const attachments = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/scopes/${scopeId}/attachments`)
			.expect(200);
		const policyId: string = attachments.body.data.attachments[0].policyId;
		const document = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${policyId}`)
			.expect(200);
		await setUpdatedAt(scopeId, PAST);

		await testServer
			.authAgentFor(owner)
			.patch(`/node-type-policies/policies/${policyId}`)
			.send({ rules: [deny('p1', GMAIL)], version: document.body.data.version })
			.expect(200);

		await expectUpdatedSincePast(project.id);
	});
});

describe('POST /project-policies access', () => {
	test('rejects a member with 403', async () => {
		const project = await createTeamProject('Member');

		const response = await createProjectPolicy(project.id, member);

		expect(response.statusCode).toBe(403);
		await expectNoProjectPolicy(project.id);
	});

	test.each(['nodeTypePolicy:manage', 'credentialTypePolicy:manage'])(
		'rejects a user who has only %s with 403',
		async (scope) => {
			const role = await createCustomRoleWithScopeSlugs([scope], { roleType: 'global' });
			const user = await createUser({ role });
			const project = await createTeamProject('One scope');

			const response = await createProjectPolicy(project.id, user);

			expect(response.statusCode).toBe(403);
			await expectNoProjectPolicy(project.id);
		},
	);

	test('accepts a user who has both scopes', async () => {
		const role = await createCustomRoleWithScopeSlugs(
			['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
			{ roleType: 'global' },
		);
		const user = await createUser({ role });
		const project = await createTeamProject('Both scopes');

		const response = await createProjectPolicy(project.id, user);

		expect(response.statusCode).toBe(200);
	});

	test('rejects an owner with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		const project = await createTeamProject('Unlicensed');

		const response = await createProjectPolicy(project.id);

		expect(response.statusCode).toBe(403);
	});

	test('rejects a body without a projectId with 400', async () => {
		const response = await testServer.authAgentFor(owner).post('/project-policies').send({});

		expect(response.statusCode).toBe(400);
	});
});

describe('POST /project-policies', () => {
	test('creates an empty allow policy of both kinds and returns the list entry', async () => {
		const project = await createTeamProject('New policy', member);

		const response = await createProjectPolicy(project.id);

		expect(response.statusCode).toBe(200);
		const summary = response.body.data as ProjectPolicySummary;
		expect(summary).toEqual({
			projectId: project.id,
			name: 'New policy',
			icon: null,
			memberCount: 1,
			hasPolicy: true,
			updatedAt: expect.any(String),
			node: { restricted: 0, optedIn: 0, effective: { allowed: 4, restricted: 0 } },
			credential: { restricted: 0, optedIn: 0, effective: { allowed: 2, restricted: 0 } },
		});
		expect(entryFor(await listProjectPolicies(), project.id)).toEqual(summary);

		const [nodeScope, credentialScope] = await Promise.all(
			BOTH_KINDS.map(async (kind) => await scopeOf(kind, project.id)),
		);
		for (const scope of [nodeScope, credentialScope]) {
			expect(scope).toMatchObject({ defaultAction: 'allow', version: 1 });
		}
		const attachments = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/scopes/${nodeScope!.id}/attachments`)
			.expect(200);
		expect(attachments.body.data.attachments).toEqual([]);
	});

	test('emits the policy events for each created kind', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const project = await createTeamProject('Events');

		await createProjectPolicy(project.id).expect(200);

		const events = emit.mock.calls.map(([event]) => event);
		expect(events.filter((event) => event === 'node-type-policy-scope-updated')).toHaveLength(2);
		expect(events.filter((event) => event === 'node-type-policy-saved')).toHaveLength(2);
	});

	test.each([
		{
			existing: 'node',
			existingKind: NODE_TYPES_KIND,
			missingKind: CREDENTIAL_TYPES_KIND,
			rule: deny('p1', NOTION),
		},
		{
			existing: 'credential',
			existingKind: CREDENTIAL_TYPES_KIND,
			missingKind: NODE_TYPES_KIND,
			rule: deny('c1', 'slackApi'),
		},
	] as const)(
		'creates only the missing kind when the $existing kind exists',
		async ({ existing, existingKind, missingKind, rule }) => {
			const project = await createTeamProject(`Only ${existing}`);
			const before = await putProjectPolicy(existing, project.id, [rule]);

			const response = await createProjectPolicy(project.id);

			expect(response.statusCode).toBe(200);
			const missing = existing === 'node' ? 'credential' : 'node';
			expect(response.body.data).toMatchObject({
				hasPolicy: true,
				[existing]: { restricted: 1, optedIn: 0 },
				[missing]: { restricted: 0, optedIn: 0 },
			});
			expect(await scopeOf(existingKind, project.id)).toMatchObject({
				id: before.scopeId,
				version: before.version,
			});
			expect(await scopeOf(missingKind, project.id)).toMatchObject({
				defaultAction: 'allow',
				version: 1,
			});
		},
	);

	test('rejects a project that has a policy of both kinds with 409, and changes nothing', async () => {
		const project = await createTeamProject('Both kinds');
		await createProjectPolicy(project.id).expect(200);

		const response = await createProjectPolicy(project.id);

		expect(response.statusCode).toBe(409);
		for (const kind of BOTH_KINDS) {
			expect(await scopeOf(kind, project.id)).toMatchObject({ version: 1 });
		}
	});

	test('rejects a personal project with 400, and saves nothing', async () => {
		const personal = await getPersonalProject(owner);

		const response = await createProjectPolicy(personal.id);

		expect(response.statusCode).toBe(400);
		await expectNoProjectPolicy(personal.id);
	});

	test('rejects an unknown project with 404', async () => {
		const response = await createProjectPolicy('does-not-exist');

		expect(response.statusCode).toBe(404);
	});

	test('saves nothing for either kind when the second write fails', async () => {
		const project = await createTeamProject('Rollback');
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const scopeRepo = Container.get(TypeAvailabilityPolicyScopeRepository);
		const createScopeIfAbsent = scopeRepo.createScopeIfAbsent.bind(scopeRepo);
		// The second write lands and then throws, so only a rollback can undo both rows.
		const spy = vi
			.spyOn(scopeRepo, 'createScopeIfAbsent')
			.mockImplementationOnce(createScopeIfAbsent)
			.mockImplementationOnce(async (input, ctx) => {
				await createScopeIfAbsent(input, ctx);
				throw new Error('second write failed');
			});

		const response = await createProjectPolicy(project.id);

		expect(response.statusCode).toBe(500);
		expect(spy).toHaveBeenCalledTimes(2);
		await expectNoProjectPolicy(project.id);
		const events = emit.mock.calls.map(([event]) => event);
		expect(events).not.toContain('node-type-policy-scope-updated');
		expect(events).not.toContain('node-type-policy-saved');
	});
});

function deleteProjectPolicy(
	projectId: string,
	versions: { node: number; credential: number },
	user = owner,
) {
	return testServer
		.authAgentFor(user)
		.delete(`/project-policies/${projectId}`)
		.query({ nodeTypesVersion: versions.node, credentialTypesVersion: versions.credential });
}

async function getProjectPolicy(kind: 'node' | 'credential', projectId: string) {
	const response = await testServer
		.authAgentFor(owner)
		.get(`/projects/${projectId}/${kind}-type-policies/project`)
		.expect(200);
	return response.body.data as { scopeId: string | null; version: number; rules: unknown[] };
}

async function attachedPolicyIds(scopeId: string, kind: 'node' | 'credential' = 'node') {
	const response = await testServer
		.authAgentFor(owner)
		.get(`/${kind}-type-policies/scopes/${scopeId}/attachments`)
		.expect(200);
	const { attachments, version } = response.body.data as {
		attachments: Array<{ policyId: string }>;
		version: number;
	};
	return { policyIds: attachments.map((attachment) => attachment.policyId), version };
}

describe('DELETE /project-policies/:projectId access', () => {
	test('rejects a member with 403', async () => {
		const project = await createTeamProject('Member');
		await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);

		const response = await deleteProjectPolicy(project.id, { node: 1, credential: 0 }, member);

		expect(response.statusCode).toBe(403);
		expect((await getProjectPolicy('node', project.id)).version).toBe(1);
	});

	test.each(['nodeTypePolicy:manage', 'credentialTypePolicy:manage'])(
		'rejects a user who has only %s with 403',
		async (scope) => {
			const project = await createTeamProject('One scope');
			await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
			const role = await createCustomRoleWithScopeSlugs([scope], { roleType: 'global' });
			const user = await createUser({ role });

			const response = await deleteProjectPolicy(project.id, { node: 1, credential: 0 }, user);

			expect(response.statusCode).toBe(403);
			expect((await getProjectPolicy('node', project.id)).version).toBe(1);
		},
	);

	test('rejects a project admin, who holds both scopes only in the project, with 403', async () => {
		const project = await createTeamProject('Project admin', member);
		await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);

		const response = await deleteProjectPolicy(project.id, { node: 1, credential: 0 }, member);

		expect(response.statusCode).toBe(403);
	});

	test('rejects an owner with 403 when the license feature is disabled', async () => {
		const project = await createTeamProject('Unlicensed');
		await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

		const response = await deleteProjectPolicy(project.id, { node: 1, credential: 0 });

		expect(response.statusCode).toBe(403);
	});

	test('rejects a request without versions with 400', async () => {
		const project = await createTeamProject('No versions');
		await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);

		const response = await testServer.authAgentFor(owner).delete(`/project-policies/${project.id}`);

		expect(response.statusCode).toBe(400);
	});
});

describe('DELETE /project-policies/:projectId', () => {
	test('deletes both kinds, so the project follows the instance policy again', async () => {
		const project = await createTeamProject('Both kinds');
		const instance = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [deny('i1', NOTION)], defaultAction: 'allow', version: 0 })
			.expect(200);
		const node = await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
		const credential = await putProjectPolicy('credential', project.id, [deny('c1', 'slackApi')]);
		const service = Container.get(TypeAvailabilityPolicyService);
		const verdict = async (kind: string, type: string) =>
			await service.evaluateComposedType(kind, project.id, type);
		expect(await verdict('node-types', SLACK)).toMatchObject({ action: 'deny', scope: 'project' });
		expect(await verdict('credential-types', 'slackApi')).toMatchObject({
			action: 'deny',
			scope: 'project',
		});

		const response = await deleteProjectPolicy(project.id, {
			node: node.version,
			credential: credential.version,
		});

		expect(response.statusCode).toBe(200);
		expect(await getProjectPolicy('node', project.id)).toMatchObject({
			scopeId: null,
			version: 0,
			rules: [],
		});
		expect(await getProjectPolicy('credential', project.id)).toMatchObject({
			scopeId: null,
			version: 0,
			rules: [],
		});
		expect(await verdict('node-types', SLACK)).toMatchObject({
			action: 'allow',
			scope: 'instance',
		});
		expect(await verdict('node-types', NOTION)).toMatchObject({
			action: 'deny',
			scope: 'instance',
		});
		expect(await verdict('credential-types', 'slackApi')).toMatchObject({
			action: 'allow',
			scope: 'instance',
		});
		expect(entryFor(await listProjectPolicies(), project.id)).toMatchObject({
			hasPolicy: false,
		});
		const instanceAfter = await testServer
			.authAgentFor(owner)
			.get('/node-type-policies/instance')
			.expect(200);
		expect(instanceAfter.body.data).toMatchObject({
			scopeId: instance.body.data.scopeId,
			version: instance.body.data.version,
			rules: [deny('i1', NOTION)],
		});
	});

	test('keeps the documents of both kinds and removes their attachments', async () => {
		const project = await createTeamProject('Documents');
		const node = await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
		const credential = await putProjectPolicy('credential', project.id, [deny('c1', 'slackApi')]);
		const [nodePolicyId] = (await attachedPolicyIds(node.scopeId)).policyIds;
		const [credentialPolicyId] = (await attachedPolicyIds(credential.scopeId, 'credential'))
			.policyIds;

		await deleteProjectPolicy(project.id, { node: 1, credential: 1 }).expect(200);

		// A document that is still attached cannot be deleted (409), so 200 proves the cascade.
		await testServer
			.authAgentFor(owner)
			.delete(`/node-type-policies/policies/${nodePolicyId}`)
			.expect(200);
		await testServer
			.authAgentFor(owner)
			.delete(`/credential-type-policies/policies/${credentialPolicyId}`)
			.expect(200);
	});

	test('keeps a library document that only the project used', async () => {
		const project = await createTeamProject('Library');
		const { scopeId } = await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
		const library = await testServer
			.authAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [deny('l1', NOTION)] })
			.expect(200);
		const libraryPolicyId: string = library.body.data.policy.id;
		const attachments = await attachedPolicyIds(scopeId);
		await testServer
			.authAgentFor(owner)
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({
				attachments: [
					{ policyId: attachments.policyIds[0], priority: 0, isFloor: false },
					{ policyId: libraryPolicyId, priority: 1, isFloor: false },
				],
				version: attachments.version,
			})
			.expect(200);
		const { version } = await getProjectPolicy('node', project.id);

		await deleteProjectPolicy(project.id, { node: version, credential: 0 }).expect(200);

		const kept = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${libraryPolicyId}`)
			.expect(200);
		expect(kept.body.data.rules).toEqual([deny('l1', NOTION)]);
	});

	test('accepts version 0 for a kind the project has no policy for', async () => {
		const project = await createTeamProject('Node only');
		await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);

		await deleteProjectPolicy(project.id, { node: 1, credential: 0 }).expect(200);

		expect((await getProjectPolicy('node', project.id)).version).toBe(0);
	});

	test.each([
		{ stale: 'node types', withCredential: false, versions: { node: 1, credential: 0 } },
		{
			stale: 'node types, with a current credential types version',
			withCredential: true,
			versions: { node: 1, credential: 1 },
		},
		{ stale: 'credential types', withCredential: true, versions: { node: 2, credential: 0 } },
		{ stale: 'a kind with no policy', withCredential: false, versions: { node: 2, credential: 1 } },
	])('fails with 409 on a stale version of $stale and deletes nothing', async (testCase) => {
		const { withCredential, versions } = testCase;
		const project = await createTeamProject('Stale');
		const first = await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
		await putProjectPolicy('node', project.id, [deny('p1', NOTION)], first.version);
		const credential = withCredential
			? await putProjectPolicy('credential', project.id, [deny('c1', 'slackApi')])
			: null;
		const [policyId] = (await attachedPolicyIds(first.scopeId)).policyIds;

		const response = await deleteProjectPolicy(project.id, versions);

		expect(response.statusCode).toBe(409);
		expect(await getProjectPolicy('node', project.id)).toMatchObject({
			scopeId: first.scopeId,
			version: 2,
			rules: [deny('p1', NOTION)],
		});
		if (credential) {
			expect((await getProjectPolicy('credential', project.id)).version).toBe(credential.version);
		}
		await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${policyId}`)
			.expect(200);
	});

	test('fails with 404 for a project with no policy', async () => {
		const project = await createTeamProject('No policy');

		const response = await deleteProjectPolicy(project.id, { node: 0, credential: 0 });

		expect(response.statusCode).toBe(404);
	});

	test('fails with 404, not 409, for an unknown project and any version', async () => {
		const response = await deleteProjectPolicy('unknown-project', { node: 5, credential: 5 });

		expect(response.statusCode).toBe(404);
	});

	test('lets the project get a new policy from version 0 after the delete', async () => {
		const project = await createTeamProject('Again');
		await putProjectPolicy('node', project.id, [deny('p1', SLACK)]);
		await deleteProjectPolicy(project.id, { node: 1, credential: 0 }).expect(200);

		const again = await putProjectPolicy('node', project.id, [deny('p1', NOTION)], 0);

		expect(again.version).toBe(1);
	});
});
