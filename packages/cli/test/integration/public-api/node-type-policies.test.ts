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
const DOCUMENT_KEYS = ['id', 'kind', 'rules', 'version', 'updatedBy', 'createdAt', 'updatedAt'];

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
		['GET', '/node-type-policies/policies'],
		['POST', '/node-type-policies/policies'],
		['GET', '/node-type-policies/policies/does-not-exist'],
		['PUT', '/node-type-policies/policies/does-not-exist'],
		['DELETE', '/node-type-policies/policies/does-not-exist'],
		['PUT', '/node-type-policies/scopes/does-not-exist/attachments'],
	])('%s %s rejects an owner key without the scope with 403', async (method, path) => {
		const agent = testServer.publicApiAgentFor(unscopedOwner);
		const response = await (method === 'GET'
			? agent.get(path)
			: method === 'POST'
				? agent.post(path).send({})
				: method === 'PUT'
					? agent.put(path).send({})
					: agent.delete(path));

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
		['GET', '/node-type-policies/policies'],
		['POST', '/node-type-policies/policies'],
		['GET', '/node-type-policies/policies/does-not-exist'],
		['PUT', '/node-type-policies/policies/does-not-exist'],
		['DELETE', '/node-type-policies/policies/does-not-exist'],
		['PUT', '/node-type-policies/scopes/does-not-exist/attachments'],
	])(
		'%s %s rejects a project admin with 403 (instance routes are global-only)',
		async (method, path) => {
			const agent = testServer.publicApiAgentFor(projectAdmin);
			const response = await (method === 'GET'
				? agent.get(path)
				: method === 'POST'
					? agent.post(path).send({})
					: method === 'PUT'
						? agent.put(path).send({})
						: agent.delete(path));

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

	test('PUT is rejected with 409 when the project document is also attached to the instance scope', async () => {
		const adminAgent = testServer.publicApiAgentFor(projectAdmin);
		const ownerAgent = testServer.publicApiAgentFor(owner);

		const configured = await adminAgent
			.put(projectRoute(project.id))
			.send({ rules: [DENY_RULE], defaultAction: 'allow', version: 0 });
		expect(configured.statusCode).toBe(200);

		const documents = await ownerAgent.get('/node-type-policies/policies');
		expect(documents.body.data).toHaveLength(1);
		const documentId = documents.body.data[0].id as string;

		const instancePut = await ownerAgent.put('/node-type-policies/instance').send(ALLOW_ALL);
		const shared = await ownerAgent
			.put(`/node-type-policies/scopes/${instancePut.body.scopeId}/attachments`)
			.send({ attachments: [{ policyId: documentId, priority: 0, isFloor: false }] });
		expect(shared.statusCode).toBe(200);

		const current = await adminAgent.get(projectRoute(project.id));
		const response = await adminAgent
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'allow', version: current.body.version });

		expect(response.statusCode).toBe(409);
	});
});

describe('node type policies public API policy documents', () => {
	test('POST creates a document and returns 201 with ISO timestamps', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [DENY_RULE] });

		expect(response.statusCode).toBe(201);
		expect(Object.keys(response.body).sort()).toEqual(['policy', 'warnings']);
		expect(Object.keys(response.body.policy).sort()).toEqual([...DOCUMENT_KEYS].sort());
		expect(response.body.policy).toMatchObject({
			kind: 'node-types',
			rules: [DENY_RULE],
			version: 1,
			updatedBy: owner.id,
		});
		expect(new Date(response.body.policy.createdAt).toISOString()).toBe(
			response.body.policy.createdAt,
		);
		expect(response.body.warnings).toEqual([]);
	});

	test('POST reports rules shadowed by an earlier rule', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [DENY_RULE, { ...DENY_RULE, id: 'r2', action: 'allow' }] });

		expect(response.statusCode).toBe(201);
		expect(response.body.warnings).toEqual([{ ruleId: 'r2', shadowedByRuleId: 'r1' }]);
	});

	test('POST rejects duplicate rule ids with 400', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [DENY_RULE, { ...DENY_RULE, action: 'allow' }] });

		expect(response.statusCode).toBe(400);
	});

	test('GET list paginates with an opaque cursor', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		for (let i = 0; i < 3; i++) {
			expect(
				(await agent.post('/node-type-policies/policies').send({ rules: [] })).statusCode,
			).toBe(201);
		}

		const firstPage = await agent.get('/node-type-policies/policies?limit=2');
		expect(firstPage.statusCode).toBe(200);
		expect(Object.keys(firstPage.body).sort()).toEqual(['data', 'nextCursor']);
		expect(firstPage.body.data).toHaveLength(2);
		expect(firstPage.body.nextCursor).toEqual(expect.any(String));

		const secondPage = await agent.get(
			`/node-type-policies/policies?cursor=${firstPage.body.nextCursor}`,
		);
		expect(secondPage.statusCode).toBe(200);
		expect(secondPage.body.data).toHaveLength(1);
		expect(secondPage.body.nextCursor).toBeNull();

		const ids = [...firstPage.body.data, ...secondPage.body.data].map((d: { id: string }) => d.id);
		expect(new Set(ids).size).toBe(3);
	});

	test('GET list rejects an invalid cursor with 400', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.get('/node-type-policies/policies?cursor=not-a-cursor');

		expect(response.statusCode).toBe(400);
	});

	test('GET, PUT, and DELETE of one document', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const created = await agent.post('/node-type-policies/policies').send({ rules: [] });
		const policyId = created.body.policy.id as string;

		const fetched = await agent.get(`/node-type-policies/policies/${policyId}`);
		expect(fetched.statusCode).toBe(200);
		expect(Object.keys(fetched.body).sort()).toEqual([...DOCUMENT_KEYS].sort());
		expect(fetched.body.id).toBe(policyId);

		const updated = await agent
			.put(`/node-type-policies/policies/${policyId}`)
			.send({ rules: [DENY_RULE], version: 1 });
		expect(updated.statusCode).toBe(200);
		expect(updated.body.policy.version).toBe(2);
		expect(updated.body.policy.rules).toEqual([DENY_RULE]);

		const stale = await agent
			.put(`/node-type-policies/policies/${policyId}`)
			.send({ rules: [], version: 1 });
		expect(stale.statusCode).toBe(409);

		const missingVersion = await agent
			.put(`/node-type-policies/policies/${policyId}`)
			.send({ rules: [] });
		expect(missingVersion.statusCode).toBe(400);

		const deleted = await agent.delete(`/node-type-policies/policies/${policyId}`);
		expect(deleted.statusCode).toBe(204);
		expect(deleted.body).toEqual({});

		const missing = await agent.get(`/node-type-policies/policies/${policyId}`);
		expect(missing.statusCode).toBe(404);

		const deleteMissing = await agent.delete(`/node-type-policies/policies/${policyId}`);
		expect(deleteMissing.statusCode).toBe(404);
	});

	test('PUT on an attached document bumps the instance scope version', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const instancePut = await agent.put('/node-type-policies/instance').send(ALLOW_ALL);
		const versionBefore = instancePut.body.version as number;

		const documents = await agent.get('/node-type-policies/policies');
		const document = documents.body.data[0];

		const updated = await agent
			.put(`/node-type-policies/policies/${document.id}`)
			.send({ rules: [DENY_RULE], version: document.version });
		expect(updated.statusCode).toBe(200);

		const instance = await agent.get('/node-type-policies/instance');
		expect(instance.body.version).toBeGreaterThan(versionBefore);
		expect(instance.body.rules).toEqual([DENY_RULE]);
	});

	test('DELETE of an attached document returns 409', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const created = await agent.post('/node-type-policies/policies').send({ rules: [] });
		const policyId = created.body.policy.id as string;

		const instancePut = await agent.put('/node-type-policies/instance').send(ALLOW_ALL);
		await agent
			.put(`/node-type-policies/scopes/${instancePut.body.scopeId}/attachments`)
			.send({ attachments: [{ policyId, priority: 5, isFloor: false }] });

		const response = await agent.delete(`/node-type-policies/policies/${policyId}`);

		expect(response.statusCode).toBe(409);
	});
});

describe('node type policies public API attachments', () => {
	test('PUT replaces the attachments, bumps the version, and fires an audit event', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');
		const agent = testServer.publicApiAgentFor(owner);

		const instancePut = await agent.put('/node-type-policies/instance').send(ALLOW_ALL);
		const scopeId = instancePut.body.scopeId as string;
		const created = await agent.post('/node-type-policies/policies').send({ rules: [DENY_RULE] });
		const policyId = created.body.policy.id as string;

		emitSpy.mockClear();
		const response = await agent
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({ attachments: [{ policyId, priority: 1, isFloor: false }] });

		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).sort()).toEqual(['attachments', 'version']);
		expect(response.body.attachments).toEqual([
			{ policyId, rules: [DENY_RULE], priority: 1, isFloor: false },
		]);
		expect(response.body.version).toBeGreaterThan(instancePut.body.version);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-attachments-updated',
			expect.objectContaining({ updatedBy: owner.id, scopeId }),
		);
	});

	test('PUT applies the same validation as the internal controller', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const instancePut = await agent.put('/node-type-policies/instance').send(ALLOW_ALL);
		const scopeId = instancePut.body.scopeId as string;

		const duplicatePolicy = await agent
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({
				attachments: [
					{ policyId: 'p1', priority: 0, isFloor: false },
					{ policyId: 'p1', priority: 1, isFloor: false },
				],
			});
		expect(duplicatePolicy.statusCode).toBe(400);

		const duplicateSlot = await agent
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({
				attachments: [
					{ policyId: 'p1', priority: 0, isFloor: false },
					{ policyId: 'p2', priority: 0, isFloor: false },
				],
			});
		expect(duplicateSlot.statusCode).toBe(400);
	});

	test('PUT on an unknown scope returns 404', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.put('/node-type-policies/scopes/does-not-exist/attachments')
			.send({ attachments: [] });

		expect(response.statusCode).toBe(404);
	});

	test('attaching a document with a delegate rule to a project scope is rejected with 400', async () => {
		const ownerAgent = testServer.publicApiAgentFor(owner);
		const configured = await testServer
			.publicApiAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send(ALLOW_ALL);
		const scopeId = configured.body.scopeId as string;

		const created = await ownerAgent
			.post('/node-type-policies/policies')
			.send({ rules: [DELEGATE_RULE] });
		expect(created.statusCode).toBe(201);

		const response = await ownerAgent
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({ attachments: [{ policyId: created.body.policy.id, priority: 0, isFloor: false }] });

		expect(response.statusCode).toBe(400);
	});
});
