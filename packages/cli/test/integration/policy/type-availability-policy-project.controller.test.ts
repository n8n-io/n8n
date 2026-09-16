import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

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
let otherProject: Project;

const projectRoute = (projectId: string) => `/projects/${projectId}/node-type-policies/project`;

const ALLOW_ALL = { rules: [], defaultAction: 'allow', version: 0 };
const DENY_RULE = { id: 'r1', action: 'deny', selector: { kind: 'name', value: 'a.b' } };
const DELEGATE_RULE = { id: 'r2', action: 'delegate', selector: { kind: 'name', value: 'a.b' } };

beforeAll(async () => {
	owner = await createOwner();
	projectAdmin = await createMember();
	projectEditor = await createMember();
	projectViewer = await createMember();
	otherProjectAdmin = await createMember();

	project = await createTeamProject('Policy project', projectAdmin);
	otherProject = await createTeamProject('Other project', otherProjectAdmin);
	await linkUserToProject(projectEditor, project, 'project:editor');
	await linkUserToProject(projectViewer, project, 'project:viewer');
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

/**
 * IAM-1142: a project admin self-governs their own project's row. Every other project role,
 * and an admin of a different project, is rejected with 403.
 */
describe('node type availability policy project controller RBAC', () => {
	test('PUT rejects a project editor with 403', async () => {
		const response = await testServer
			.authAgentFor(projectEditor)
			.put(projectRoute(project.id))
			.send(ALLOW_ALL);

		expect(response.statusCode).toBe(403);
	});

	test('GET rejects a project editor with 403', async () => {
		const response = await testServer.authAgentFor(projectEditor).get(projectRoute(project.id));

		expect(response.statusCode).toBe(403);
	});

	test('GET rejects a project viewer with 403', async () => {
		const response = await testServer.authAgentFor(projectViewer).get(projectRoute(project.id));

		expect(response.statusCode).toBe(403);
	});

	test('GET rejects the admin of a different project with 403', async () => {
		const response = await testServer.authAgentFor(otherProjectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(403);
	});

	test('PUT rejects the admin of a different project with 403 and writes nothing', async () => {
		const response = await testServer
			.authAgentFor(otherProjectAdmin)
			.put(projectRoute(project.id))
			.send({ ...ALLOW_ALL, defaultAction: 'deny' });

		expect(response.statusCode).toBe(403);

		const unchanged = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		expect(unchanged.body.data.version).toBe(0);
	});

	test('an unauthenticated caller is rejected before the scope check even runs', async () => {
		const response = await testServer.authlessAgent.get(projectRoute(project.id));

		expect(response.statusCode).toBe(401);
	});

	test('the admin of the project is not rejected by the scope check', async () => {
		const response = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(200);
	});

	test('an instance owner without a project role is not rejected by the scope check', async () => {
		const response = await testServer.authAgentFor(owner).get(projectRoute(project.id));

		expect(response.statusCode).toBe(200);
	});
});

describe('node type availability policy project controller license gating', () => {
	afterEach(() => {
		testServer.license.enable(LICENSE_FEATURES.NODE_TYPE_POLICIES);
	});

	test('rejects a project admin with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.NODE_TYPE_POLICIES);

		const response = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(403);
	});
});

describe('node type availability policy project controller project admin happy path', () => {
	test('GET on a project that was never configured reports allow-all at version 0', async () => {
		const response = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({
			scopeId: null,
			rules: [],
			defaultAction: 'allow',
			version: 0,
		});
	});

	test('PUT persists, bumps version, and fires an audit event scoped to the project', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const first = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [DENY_RULE], defaultAction: 'allow', version: 0 });

		expect(first.statusCode).toBe(200);
		expect(first.body.data.version).toBeGreaterThan(0);
		expect(first.body.data.rules).toEqual([DENY_RULE]);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: projectAdmin.id, projectId: project.id, before: null }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-created',
			expect.objectContaining({ updatedBy: projectAdmin.id }),
		);

		const persisted = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		expect(persisted.body.data.rules).toEqual(first.body.data.rules);
		expect(persisted.body.data.version).toBe(first.body.data.version);

		emitSpy.mockClear();
		const second = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'deny', version: first.body.data.version });

		expect(second.statusCode).toBe(200);
		expect(second.body.data.version).toBeGreaterThan(first.body.data.version);
		expect(second.body.data.defaultAction).toBe('deny');
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: projectAdmin.id, projectId: project.id }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-updated',
			expect.objectContaining({ updatedBy: projectAdmin.id }),
		);
	});

	test('a project write leaves the instance scope and other projects untouched', async () => {
		const written = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [DENY_RULE], defaultAction: 'deny', version: 0 });
		expect(written.statusCode).toBe(200);

		const instance = await testServer.authAgentFor(owner).get('/node-type-policies/instance');
		expect(instance.body.data.version).toBe(0);
		expect(instance.body.data.defaultAction).toBe('allow');

		const other = await testServer
			.authAgentFor(otherProjectAdmin)
			.get(projectRoute(otherProject.id));
		expect(other.body.data.version).toBe(0);
		expect(other.body.data.rules).toEqual([]);
	});

	test('PUT with a stale version returns 409', async () => {
		const first = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send(ALLOW_ALL);
		expect(first.statusCode).toBe(200);

		const stale = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ ...ALLOW_ALL, defaultAction: 'deny' });

		expect(stale.statusCode).toBe(409);
	});

	test('PUT with a delegate defaultAction is rejected with 400 and writes nothing', async () => {
		const response = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'delegate', version: 0 });

		expect(response.statusCode).toBe(400);

		const unchanged = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		expect(unchanged.body.data.version).toBe(0);
	});

	test('PUT with a delegate rule is rejected with 400 and writes nothing', async () => {
		const response = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [DELEGATE_RULE], defaultAction: 'allow', version: 0 });

		expect(response.statusCode).toBe(400);

		const unchanged = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		expect(unchanged.body.data.version).toBe(0);
	});
});

/**
 * The project write edits the project's single document in place. When instance-only
 * attachment management has made that document reach further than the project — shared with
 * another scope, or one of several — the write is refused rather than silently changing
 * policy the project admin does not govern.
 */
describe('node type availability policy project controller shared document protection', () => {
	async function configureProject() {
		const response = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [DENY_RULE], defaultAction: 'allow', version: 0 });
		expect(response.statusCode).toBe(200);

		const documents = await testServer.authAgentFor(owner).get('/node-type-policies/policies');
		expect(documents.body.data).toHaveLength(1);

		return {
			scopeId: response.body.data.scopeId as string,
			documentId: documents.body.data[0].id as string,
		};
	}

	test('PUT is rejected with 409 when the project document is also attached to the instance scope', async () => {
		const { documentId } = await configureProject();

		const instancePut = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send(ALLOW_ALL);
		const instanceScopeId = instancePut.body.data.scopeId;

		const shared = await testServer
			.authAgentFor(owner)
			.put(`/node-type-policies/scopes/${instanceScopeId}/attachments`)
			.send({ attachments: [{ policyId: documentId, priority: 0, isFloor: false }] });
		expect(shared.statusCode).toBe(200);

		const current = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		const response = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'allow', version: current.body.data.version });

		expect(response.statusCode).toBe(409);

		const document = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${documentId}`);
		expect(document.body.data.rules).toEqual([DENY_RULE]);
	});

	test('PUT is rejected with 409 when the project scope has several attached documents', async () => {
		const { scopeId, documentId } = await configureProject();

		const created = await testServer
			.authAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [] });
		const secondDocumentId = created.body.data.policy.id;

		const attached = await testServer
			.authAgentFor(owner)
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({
				attachments: [
					{ policyId: documentId, priority: 0, isFloor: false },
					{ policyId: secondDocumentId, priority: 1, isFloor: false },
				],
			});
		expect(attached.statusCode).toBe(200);

		const current = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		const response = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send({ rules: [], defaultAction: 'allow', version: current.body.data.version });

		expect(response.statusCode).toBe(409);
	});
});

/**
 * `delegate` is rejected on every path that puts rules on a project row, not only the
 * project's own composed write.
 */
describe('node type availability policy project controller delegate rejection via attachments', () => {
	test('attaching a document with a delegate rule to a project scope is rejected with 400', async () => {
		const configured = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send(ALLOW_ALL);
		const scopeId = configured.body.data.scopeId;

		const created = await testServer
			.authAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [DELEGATE_RULE] });
		expect(created.statusCode).toBe(200);

		const response = await testServer
			.authAgentFor(owner)
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({
				attachments: [{ policyId: created.body.data.policy.id, priority: 0, isFloor: false }],
			});

		expect(response.statusCode).toBe(400);

		const unchanged = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		expect(unchanged.body.data.rules).toEqual([]);
	});

	test('adding a delegate rule to a document attached to a project scope is rejected with 400', async () => {
		const configured = await testServer
			.authAgentFor(projectAdmin)
			.put(projectRoute(project.id))
			.send(ALLOW_ALL);
		expect(configured.statusCode).toBe(200);

		const documents = await testServer.authAgentFor(owner).get('/node-type-policies/policies');
		const document = documents.body.data[0];

		const response = await testServer
			.authAgentFor(owner)
			.patch(`/node-type-policies/policies/${document.id}`)
			.send({ rules: [DELEGATE_RULE], version: document.version });

		expect(response.statusCode).toBe(400);

		const unchanged = await testServer.authAgentFor(projectAdmin).get(projectRoute(project.id));
		expect(unchanged.body.data.rules).toEqual([]);
	});

	test('adding a delegate rule to a document attached to the instance scope only still works', async () => {
		const instancePut = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send(ALLOW_ALL);
		expect(instancePut.statusCode).toBe(200);

		const documents = await testServer.authAgentFor(owner).get('/node-type-policies/policies');
		const document = documents.body.data[0];

		const response = await testServer
			.authAgentFor(owner)
			.patch(`/node-type-policies/policies/${document.id}`)
			.send({ rules: [DELEGATE_RULE], version: document.version });

		expect(response.statusCode).toBe(200);
	});
});
