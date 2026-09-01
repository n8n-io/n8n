import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

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
	// happy-path suite added next — kept here only as a smoke check that the fixture itself
	// is wired to a real, scoped user.
	test('an owner is not rejected by the scope check', async () => {
		const response = await testServer.authAgentFor(owner).get('/node-type-policies/instance');

		expect(response.statusCode).toBe(200);
	});
});
