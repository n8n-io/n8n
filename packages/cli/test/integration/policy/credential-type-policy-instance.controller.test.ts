import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { TypeAvailabilityPolicyRepository } from '@/modules/type-availability-policies/database/repositories/type-availability-policy.repository';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.NODE_TYPE_POLICIES],
});

let owner: User;
let member: User;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

/**
 * A member has neither `nodeTypePolicy:manage` nor `credentialTypePolicy:manage`, so this only
 * proves the route is gated at all. That the two permissions are independent is
 * `@n8n/permissions`' own test, not this controller's.
 */
describe('credential type availability policy instance controller RBAC', () => {
	test('PUT /credential-type-policies/instance rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.put('/credential-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });

		expect(response.statusCode).toBe(403);
	});

	test('GET /credential-type-policies/instance rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.get('/credential-type-policies/instance');

		expect(response.statusCode).toBe(403);
	});

	test('an unauthenticated caller is rejected before the scope check even runs', async () => {
		const response = await testServer.authlessAgent.get('/credential-type-policies/instance');

		expect(response.statusCode).toBe(401);
	});

	test('an owner is not rejected by the scope check', async () => {
		const response = await testServer.authAgentFor(owner).get('/credential-type-policies/instance');

		expect(response.statusCode).toBe(200);
	});
});

describe('credential type availability policy instance controller license gating', () => {
	afterEach(() => {
		testServer.license.enable(LICENSE_FEATURES.NODE_TYPE_POLICIES);
	});

	test('rejects an owner with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.NODE_TYPE_POLICIES);

		const response = await testServer.authAgentFor(owner).get('/credential-type-policies/instance');

		expect(response.statusCode).toBe(403);
	});
});

describe('credential type availability policy instance controller admin happy path', () => {
	test('PUT /instance persists and fires an audit event carrying the credential-types kind', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const response = await testServer
			.authAgentFor(owner)
			.put('/credential-type-policies/instance')
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'slackApi' } }],
				defaultAction: 'allow',
				version: 0,
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.version).toBeGreaterThan(0);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: owner.id, kind: 'credential-types' }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-created',
			expect.objectContaining({ updatedBy: owner.id, kind: 'credential-types' }),
		);

		const persisted = await testServer
			.authAgentFor(owner)
			.get('/credential-type-policies/instance');
		expect(persisted.body.data.rules).toEqual(response.body.data.rules);
	});

	test('policy document CRUD persists, distinctly from node type policy documents', async () => {
		const created = await testServer
			.authAgentFor(owner)
			.post('/credential-type-policies/policies')
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'slackApi' } }],
			});

		expect(created.statusCode).toBe(200);
		const policyId: string = created.body.data.policy.id;

		const fetchedAsCredential = await testServer
			.authAgentFor(owner)
			.get(`/credential-type-policies/policies/${policyId}`);
		expect(fetchedAsCredential.statusCode).toBe(200);

		// The document has kind `credential-types`: the node-types instance controller must not
		// reach it by id, and vice versa — proven here through this controller's own route.
		const fetchedAsNode = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${policyId}`);
		expect(fetchedAsNode.statusCode).toBe(404);

		const deleted = await testServer
			.authAgentFor(owner)
			.delete(`/credential-type-policies/policies/${policyId}`);
		expect(deleted.statusCode).toBe(200);

		expect(
			await Container.get(TypeAvailabilityPolicyRepository).findByIdAndKind(
				policyId,
				'credential-types',
				{},
			),
		).toBeNull();

		const afterDelete = await testServer
			.authAgentFor(owner)
			.get(`/credential-type-policies/policies/${policyId}`);
		expect(afterDelete.statusCode).toBe(404);
	});

	test('GET /policies lists every credential-types document', async () => {
		await testServer
			.authAgentFor(owner)
			.post('/credential-type-policies/policies')
			.send({ rules: [] });

		const listed = await testServer.authAgentFor(owner).get('/credential-type-policies/policies');

		expect(listed.statusCode).toBe(200);
		expect(listed.body.data).toHaveLength(1);
	});

	test('PATCH /policies/:policyId persists new rules and bumps the version', async () => {
		const created = await testServer
			.authAgentFor(owner)
			.post('/credential-type-policies/policies')
			.send({ rules: [] });
		const policyId: string = created.body.data.policy.id;

		const updated = await testServer
			.authAgentFor(owner)
			.patch(`/credential-type-policies/policies/${policyId}`)
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'slackApi' } }],
				version: 1,
			});

		expect(updated.statusCode).toBe(200);
		expect(updated.body.data.policy.version).toBe(2);
		expect(updated.body.data.policy.rules).toEqual([
			{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'slackApi' } },
		]);
	});

	test('PUT /scopes/:scopeId/attachments persists and fires an audit event', async () => {
		const instancePut = await testServer
			.authAgentFor(owner)
			.put('/credential-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });
		const scopeId = instancePut.body.data.scopeId;

		const created = await testServer
			.authAgentFor(owner)
			.post('/credential-type-policies/policies')
			.send({ rules: [] });
		const policyId: string = created.body.data.policy.id;

		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const response = await testServer
			.authAgentFor(owner)
			.put(`/credential-type-policies/scopes/${scopeId}/attachments`)
			.send({ attachments: [{ policyId, priority: 0, isFloor: false }] });

		expect(response.statusCode).toBe(200);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-attachments-updated',
			expect.objectContaining({ updatedBy: owner.id, kind: 'credential-types', scopeId }),
		);
	});

	/**
	 * A principal with only `credentialTypePolicy:manage` (not `nodeTypePolicy:manage`) must not
	 * be able to clear or rewrite a node-types scope's attachments by guessing its scope id —
	 * `assertAttachableToScope` alone would not catch this, since an empty attachment list never
	 * reaches it.
	 */
	test('PUT /scopes/:scopeId/attachments refuses a node-types scope, even with no attachments', async () => {
		const nodeInstancePut = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });
		const nodeScopeId = nodeInstancePut.body.data.scopeId;

		const response = await testServer
			.authAgentFor(owner)
			.put(`/credential-type-policies/scopes/${nodeScopeId}/attachments`)
			.send({ attachments: [] });

		expect(response.statusCode).toBe(404);

		const unchanged = await testServer.authAgentFor(owner).get('/node-type-policies/instance');
		expect(unchanged.body.data.version).toBe(nodeInstancePut.body.data.version);
	});
});
