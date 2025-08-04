'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const telemetry_1 = require('@/telemetry');
const users_1 = require('@test-integration/db/users');
const utils_1 = require('@test-integration/utils');
describe('Users in Public API', () => {
	const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['publicApi'] });
	(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['User']);
	});
	describe('POST /users', () => {
		it('if not authenticated, should reject', async () => {
			const payload = { email: 'test@test.com', role: 'global:admin' };
			const response = await testServer.publicApiAgentWithApiKey('').post('/users').send(payload);
			expect(response.status).toBe(401);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const member = await (0, users_1.createMemberWithApiKey)();
			const payload = [{ email: 'test@test.com', role: 'global:admin' }];
			const response = await testServer.publicApiAgentFor(member).post('/users').send(payload);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
		it('should create a user', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			await (0, users_1.createOwnerWithApiKey)();
			const payload = [{ email: 'test@test.com', role: 'global:admin' }];
			const response = await testServer.publicApiAgentFor(owner).post('/users').send(payload);
			expect(response.status).toBe(201);
			expect(response.body).toHaveLength(1);
			const [result] = response.body;
			const { user: returnedUser, error } = result;
			const payloadUser = payload[0];
			expect(returnedUser).toHaveProperty('email', payload[0].email);
			expect(typeof returnedUser.inviteAcceptUrl).toBe('string');
			expect(typeof returnedUser.emailSent).toBe('boolean');
			expect(error).toBe('');
			const storedUser = await (0, users_1.getUserById)(returnedUser.id);
			expect(returnedUser.id).toBe(storedUser.id);
			expect(returnedUser.email).toBe(storedUser.email);
			expect(returnedUser.email).toBe(payloadUser.email);
			expect(storedUser.role).toBe(payloadUser.role);
		});
	});
	describe('DELETE /users/:id', () => {
		it('if not authenticated, should reject', async () => {
			const member = await (0, users_1.createMember)();
			const response = await testServer.publicApiAgentWithApiKey('').delete(`/users/${member.id}`);
			expect(response.status).toBe(401);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const member = await (0, users_1.createMemberWithApiKey)();
			const secondMember = await (0, users_1.createMember)();
			const response = await testServer
				.publicApiAgentFor(member)
				.delete(`/users/${secondMember.id}`);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
		it('should delete a user', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const member = await (0, users_1.createMember)();
			const response = await testServer.publicApiAgentFor(owner).delete(`/users/${member.id}`);
			expect(response.status).toBe(204);
			await expect((0, users_1.getUserById)(member.id)).rejects.toThrow();
		});
	});
	describe('PATCH /users/:id/role', () => {
		it('if not authenticated, should reject', async () => {
			const member = await (0, users_1.createMember)();
			const response = await testServer
				.publicApiAgentWithApiKey('')
				.patch(`/users/${member.id}/role`);
			expect(response.status).toBe(401);
		});
		it('if not licensed, should reject', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const member = await (0, users_1.createMember)();
			const payload = { newRoleName: 'global:admin' };
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:advancedPermissions')
					.message,
			);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const member = await (0, users_1.createMemberWithApiKey)();
			const secondMember = await (0, users_1.createMember)();
			const payload = { newRoleName: 'global:admin' };
			const response = await testServer
				.publicApiAgentFor(member)
				.patch(`/users/${secondMember.id}/role`)
				.send(payload);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
		it('should return a 400 on invalid payload', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const member = await (0, users_1.createMember)();
			const payload = { newRoleName: 'invalid' };
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);
			expect(response.status).toBe(400);
		});
		it("should change a user's role", async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const member = await (0, users_1.createMember)();
			const payload = { newRoleName: 'global:admin' };
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);
			expect(response.status).toBe(204);
			const storedUser = await (0, users_1.getUserById)(member.id);
			expect(storedUser.role).toBe(payload.newRoleName);
		});
	});
});
//# sourceMappingURL=users.test.js.map
