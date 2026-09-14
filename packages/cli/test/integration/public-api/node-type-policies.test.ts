import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.NODE_TYPE_POLICIES],
});

let owner: User;
let unscopedOwner: User;
let projectAdmin: User;
let projectEditor: User;
let otherProjectAdmin: User;
let project: Project;
let otherProject: Project;

const projectRoute = (projectId: string) => `/node-type-policies/projects/${projectId}`;

const ALLOW_ALL = { rules: [], defaultAction: 'allow', version: 0 };
const DENY_RULE = { id: 'r1', action: 'deny', selector: { kind: 'name', value: 'a.b' } };
const DELEGATE_RULE = { id: 'r2', action: 'delegate', selector: { kind: 'name', value: 'a.b' } };

const EFFECTIVE_KEYS = ['scopeId', 'rules', 'defaultAction', 'version'];

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
	projectAdmin = await createMemberWithApiKey({ scopes: ['nodeTypePolicy:manage'] });
	projectEditor = await createMemberWithApiKey({ scopes: ['nodeTypePolicy:manage'] });
	otherProjectAdmin = await createMemberWithApiKey({ scopes: ['nodeTypePolicy:manage'] });

	project = await createTeamProject('Policy project', projectAdmin);
	otherProject = await createTeamProject('Other project', otherProjectAdmin);
	await linkUserToProject(projectEditor, project, 'project:editor');
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

/**
 * Least privilege first: the API-key scope check and the RBAC check are independent, so a key
 * that lacks the scope and a key whose user lacks the RBAC grant are both rejected with 403.
 */
describe('node type policies public API authorization', () => {
	test('an unauthenticated caller is rejected with 401', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.get('/node-type-policies/instance');

		expect(response.statusCode).toBe(401);
	});

	test.each([
		['GET', '/node-type-policies/instance'],
		['PUT', '/node-type-policies/instance'],
	])('%s %s rejects an owner key without the scope with 403', async (method, path) => {
		const agent = testServer.publicApiAgentFor(unscopedOwner);
		const response = await (method === 'GET' ? agent.get(path) : agent.put(path).send({}));

		expect(response.statusCode).toBe(403);
	});

	test('GET/PUT on a project rejects an owner key without the scope with 403', async () => {
		const agent = testServer.publicApiAgentFor(unscopedOwner);

		expect((await agent.get(projectRoute(project.id))).statusCode).toBe(403);
		expect((await agent.put(projectRoute(project.id)).send(ALLOW_ALL)).statusCode).toBe(403);
	});

	test.each([
		['GET', '/node-type-policies/instance'],
		['PUT', '/node-type-policies/instance'],
	])(
		'%s %s rejects a project admin with 403 (instance routes are global-only)',
		async (method, path) => {
			const agent = testServer.publicApiAgentFor(projectAdmin);
			const response = await (method === 'GET' ? agent.get(path) : agent.put(path).send({}));

			expect(response.statusCode).toBe(403);
		},
	);

	test('GET/PUT on a project rejects a project editor with 403', async () => {
		const agent = testServer.publicApiAgentFor(projectEditor);

		expect((await agent.get(projectRoute(project.id))).statusCode).toBe(403);
		expect((await agent.put(projectRoute(project.id)).send(ALLOW_ALL)).statusCode).toBe(403);
	});

	test('PUT on a project rejects the admin of another project with 403 and writes nothing', async () => {
		const response = await testServer
			.publicApiAgentFor(otherProjectAdmin)
			.put(projectRoute(project.id))
			.send({ ...ALLOW_ALL, defaultAction: 'deny' });

		expect(response.statusCode).toBe(403);

		const unchanged = await testServer
			.publicApiAgentFor(projectAdmin)
			.get(projectRoute(project.id));
		expect(unchanged.body.version).toBe(0);
	});

	test('the admin of the project and an instance owner are not rejected by the scope check', async () => {
		expect(
			(await testServer.publicApiAgentFor(projectAdmin).get(projectRoute(project.id))).statusCode,
		).toBe(200);
		expect(
			(await testServer.publicApiAgentFor(owner).get(projectRoute(project.id))).statusCode,
		).toBe(200);
	});
});

describe('node type policies public API license gating', () => {
	afterEach(() => {
		testServer.license.enable(LICENSE_FEATURES.NODE_TYPE_POLICIES);
	});

	test('rejects an owner with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.NODE_TYPE_POLICIES);

		const instance = await testServer.publicApiAgentFor(owner).get('/node-type-policies/instance');
		expect(instance.statusCode).toBe(403);

		const projectPolicy = await testServer
			.publicApiAgentFor(projectAdmin)
			.get(projectRoute(project.id));
		expect(projectPolicy.statusCode).toBe(403);
	});
});

describe('node type policies public API instance scope', () => {
	test('GET on an unconfigured instance reports allow-all at version 0', async () => {
		const response = await testServer.publicApiAgentFor(owner).get('/node-type-policies/instance');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ scopeId: null, rules: [], defaultAction: 'allow', version: 0 });
	});

	test('PUT persists, bumps version, and fires the same audit events as the internal controller', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const first = await testServer
			.publicApiAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [DENY_RULE], defaultAction: 'allow', version: 0 });

		expect(first.statusCode).toBe(200);
		expect(Object.keys(first.body).sort()).toEqual([...EFFECTIVE_KEYS, 'warnings'].sort());
		expect(first.body.version).toBeGreaterThan(0);
		expect(first.body.rules).toEqual([DENY_RULE]);
		expect(first.body.warnings).toEqual([]);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: owner.id, projectId: null, before: null }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-created',
			expect.objectContaining({ updatedBy: owner.id }),
		);

		const persisted = await testServer.publicApiAgentFor(owner).get('/node-type-policies/instance');
		expect(Object.keys(persisted.body).sort()).toEqual([...EFFECTIVE_KEYS].sort());
		expect(persisted.body.rules).toEqual(first.body.rules);
		expect(persisted.body.version).toBe(first.body.version);

		emitSpy.mockClear();
		const second = await testServer
			.publicApiAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'deny', version: first.body.version });

		expect(second.statusCode).toBe(200);
		expect(second.body.version).toBeGreaterThan(first.body.version);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-updated',
			expect.objectContaining({ updatedBy: owner.id }),
		);
	});

	test('a GET body round-trips as a PUT body', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await agent
			.put('/node-type-policies/instance')
			.send({ rules: [DENY_RULE], defaultAction: 'deny', version: 0 });

		const current = await agent.get('/node-type-policies/instance');
		const response = await agent.put('/node-type-policies/instance').send(current.body);

		expect(response.statusCode).toBe(200);
		expect(response.body.rules).toEqual([DENY_RULE]);
	});

	test('PUT with a stale version returns 409', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		expect((await agent.put('/node-type-policies/instance').send(ALLOW_ALL)).statusCode).toBe(200);

		const stale = await agent
			.put('/node-type-policies/instance')
			.send({ ...ALLOW_ALL, defaultAction: 'deny' });

		expect(stale.statusCode).toBe(409);
	});

	test('PUT applies the same validation as the internal controller', async () => {
		const agent = testServer.publicApiAgentFor(owner);

		const duplicateIds = await agent.put('/node-type-policies/instance').send({
			rules: [DENY_RULE, { ...DENY_RULE, action: 'allow' }],
			defaultAction: 'allow',
			version: 0,
		});
		expect(duplicateIds.statusCode).toBe(400);

		const unknownAction = await agent
			.put('/node-type-policies/instance')
			.send({ rules: [{ ...DENY_RULE, action: 'block' }], defaultAction: 'allow', version: 0 });
		expect(unknownAction.statusCode).toBe(400);

		const missingVersion = await agent
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow' });
		expect(missingVersion.statusCode).toBe(400);

		// A delegate rule is valid at instance scope.
		const delegating = await agent
			.put('/node-type-policies/instance')
			.send({ rules: [DELEGATE_RULE], defaultAction: 'allow', version: 0 });
		expect(delegating.statusCode).toBe(200);
	});
});

describe('node type policies public API project scope', () => {
	test('GET on an unconfigured project reports allow-all at version 0', async () => {
		const response = await testServer.publicApiAgentFor(projectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ scopeId: null, rules: [], defaultAction: 'allow', version: 0 });
	});

	test('PUT by a project admin persists and fires an audit event scoped to the project', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const response = await testServer
			.publicApiAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [DENY_RULE], defaultAction: 'deny', version: 0 });

		expect(response.statusCode).toBe(200);
		expect(response.body.version).toBeGreaterThan(0);
		expect(response.body.defaultAction).toBe('deny');
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: projectAdmin.id, projectId: project.id, before: null }),
		);

		const instance = await testServer.publicApiAgentFor(owner).get('/node-type-policies/instance');
		expect(instance.body.version).toBe(0);

		const other = await testServer
			.publicApiAgentFor(otherProjectAdmin)
			.get(projectRoute(otherProject.id));
		expect(other.body.version).toBe(0);
	});

	test('PUT with a stale version returns 409', async () => {
		const agent = testServer.publicApiAgentFor(projectAdmin);
		expect((await agent.put(projectRoute(project.id)).send(ALLOW_ALL)).statusCode).toBe(200);

		const stale = await agent
			.put(projectRoute(project.id))
			.send({ ...ALLOW_ALL, defaultAction: 'deny' });

		expect(stale.statusCode).toBe(409);
	});

	test('PUT rejects delegate in defaultAction and in a rule with 400 and writes nothing', async () => {
		const agent = testServer.publicApiAgentFor(projectAdmin);

		const delegateDefault = await agent
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'delegate', version: 0 });
		expect(delegateDefault.statusCode).toBe(400);

		const delegateRule = await agent
			.put(projectRoute(project.id))
			.send({ rules: [DELEGATE_RULE], defaultAction: 'allow', version: 0 });
		expect(delegateRule.statusCode).toBe(400);

		const unchanged = await agent.get(projectRoute(project.id));
		expect(unchanged.body.version).toBe(0);
	});
});
