import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
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
 * IAM-1141 AC2: a project member attempting to write the instance policy is rejected with
 * 403. This suite is committed before the admin happy-path suite, so the RBAC-denial
 * coverage lands and passes on its own first.
 */
describe('node type availability policy instance controller RBAC', () => {
	test('PUT /node-type-policies/instance rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });

		expect(response.statusCode).toBe(403);
	});

	test('GET /node-type-policies/instance rejects a member with 403', async () => {
		const response = await testServer.authAgentFor(member).get('/node-type-policies/instance');

		expect(response.statusCode).toBe(403);
	});

	test('POST /node-type-policies/policies rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.post('/node-type-policies/policies')
			.send({ rules: [] });

		expect(response.statusCode).toBe(403);
	});

	test('GET /node-type-policies/policies rejects a member with 403', async () => {
		const response = await testServer.authAgentFor(member).get('/node-type-policies/policies');

		expect(response.statusCode).toBe(403);
	});

	test('PATCH /node-type-policies/policies/:policyId rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.patch('/node-type-policies/policies/does-not-exist')
			.send({ rules: [] });

		expect(response.statusCode).toBe(403);
	});

	test('DELETE /node-type-policies/policies/:policyId rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.delete('/node-type-policies/policies/does-not-exist');

		expect(response.statusCode).toBe(403);
	});

	test('PUT /node-type-policies/scopes/:scopeId/attachments rejects a member with 403', async () => {
		const response = await testServer
			.authAgentFor(member)
			.put('/node-type-policies/scopes/does-not-exist/attachments')
			.send({ attachments: [] });

		expect(response.statusCode).toBe(403);
	});

	test('an unauthenticated caller is rejected before the scope check even runs', async () => {
		const response = await testServer.authlessAgent.get('/node-type-policies/instance');

		expect(response.statusCode).toBe(401);
	});

	// `owner` is asserted able to reach the routes (not rejected by scope) in the admin
	// happy-path suite below — kept here only as a smoke check that the fixture itself
	// is wired to a real, scoped user.
	test('an owner is not rejected by the scope check', async () => {
		const response = await testServer.authAgentFor(owner).get('/node-type-policies/instance');

		expect(response.statusCode).toBe(200);
	});
});

describe('node type availability policy instance controller admin happy path', () => {
	test('PUT /instance persists, bumps version, and fires an audit event', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const first = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({
				rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'a.b' } }],
				defaultAction: 'allow',
				version: 0,
			});

		expect(first.statusCode).toBe(200);
		expect(first.body.data.version).toBeGreaterThan(0);
		expect(first.body.data.rules).toEqual([
			{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'a.b' } },
		]);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: owner.id, before: null }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-created',
			expect.objectContaining({ updatedBy: owner.id }),
		);

		const persisted = await testServer.authAgentFor(owner).get('/node-type-policies/instance');
		expect(persisted.body.data.rules).toEqual(first.body.data.rules);
		expect(persisted.body.data.version).toBe(first.body.data.version);

		emitSpy.mockClear();
		const second = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({
				rules: [{ id: 'r2', action: 'allow', selector: { kind: 'package', value: 'x' } }],
				defaultAction: 'deny',
				version: first.body.data.version,
			});

		expect(second.statusCode).toBe(200);
		expect(second.body.data.version).toBeGreaterThan(first.body.data.version);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-scope-updated',
			expect.objectContaining({ updatedBy: owner.id }),
		);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-document-updated',
			expect.objectContaining({ updatedBy: owner.id }),
		);
	});

	test('PUT /instance with a stale version returns 409', async () => {
		const first = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });
		expect(first.statusCode).toBe(200);

		const stale = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'deny', version: 0 });

		expect(stale.statusCode).toBe(409);
	});

	test('policy document CRUD persists', async () => {
		const created = await testServer
			.authAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [{ id: 'r1', action: 'deny', selector: { kind: 'name', value: 'a.b' } }] });

		expect(created.statusCode).toBe(200);
		const policyId = created.body.data.policy.id;

		const fetched = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${policyId}`);
		expect(fetched.statusCode).toBe(200);
		expect(fetched.body.data.rules).toHaveLength(1);

		const updated = await testServer
			.authAgentFor(owner)
			.patch(`/node-type-policies/policies/${policyId}`)
			.send({ rules: [] });
		expect(updated.statusCode).toBe(200);
		expect(updated.body.data.policy.version).toBe(2);

		const deleted = await testServer
			.authAgentFor(owner)
			.delete(`/node-type-policies/policies/${policyId}`);
		expect(deleted.statusCode).toBe(200);

		const missing = await testServer
			.authAgentFor(owner)
			.get(`/node-type-policies/policies/${policyId}`);
		expect(missing.statusCode).toBe(404);
	});

	test('DELETE /policies/:policyId on an attached policy returns 409, not a raw SQL error', async () => {
		const created = await testServer
			.authAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [] });
		const policyId = created.body.data.policy.id;

		const instancePut = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });
		const scopeId = instancePut.body.data.scopeId;

		await testServer
			.authAgentFor(owner)
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({ attachments: [{ policyId, priority: 5, isFloor: false }] });

		const response = await testServer
			.authAgentFor(owner)
			.delete(`/node-type-policies/policies/${policyId}`);

		expect(response.statusCode).toBe(409);
	});

	test('PUT /scopes/:scopeId/attachments persists and fires an audit event', async () => {
		const eventService = Container.get(EventService);
		const emitSpy = vi.spyOn(eventService, 'emit');

		const instancePut = await testServer
			.authAgentFor(owner)
			.put('/node-type-policies/instance')
			.send({ rules: [], defaultAction: 'allow', version: 0 });
		const scopeId = instancePut.body.data.scopeId;

		const created = await testServer
			.authAgentFor(owner)
			.post('/node-type-policies/policies')
			.send({ rules: [] });
		const policyId = created.body.data.policy.id;

		emitSpy.mockClear();
		const response = await testServer
			.authAgentFor(owner)
			.put(`/node-type-policies/scopes/${scopeId}/attachments`)
			.send({ attachments: [{ policyId, priority: 1, isFloor: false }] });

		expect(response.statusCode).toBe(200);
		expect(emitSpy).toHaveBeenCalledWith(
			'node-type-policy-attachments-updated',
			expect.objectContaining({ updatedBy: owner.id, scopeId }),
		);
	});
});
