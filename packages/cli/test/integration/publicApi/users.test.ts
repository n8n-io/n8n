import { setupTestServer } from '@test-integration/utils';
import * as testDb from '../shared/testDb';
import { createMember, createOwner, getUserById } from '@test-integration/db/users';
import { mockInstance } from '@test/mocking';
import { Telemetry } from '@/telemetry';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';

describe('Users in Public API', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	mockInstance(Telemetry);

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	describe('POST /users', () => {
		it('if not authenticated, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwner({ withApiKey: false });
			const payload = { email: 'test@test.com', role: 'global:admin' };

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).post('/users').send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const member = await createMember({ withApiKey: true });
			const payload = [{ email: 'test@test.com', role: 'global:admin' }];

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(member).post('/users').send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('should create a user', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwner({ withApiKey: true });
			const payload = [{ email: 'test@test.com', role: 'global:admin' }];

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).post('/users').send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(201);

			expect(response.body).toHaveLength(1);

			const [result] = response.body;
			const { user: returnedUser, error } = result;
			const payloadUser = payload[0];

			expect(returnedUser).toHaveProperty('email', payload[0].email);
			expect(typeof returnedUser.inviteAcceptUrl).toBe('string');
			expect(typeof returnedUser.emailSent).toBe('boolean');
			expect(error).toBe('');

			const storedUser = await getUserById(returnedUser.id);
			expect(returnedUser.id).toBe(storedUser.id);
			expect(returnedUser.email).toBe(storedUser.email);
			expect(returnedUser.email).toBe(payloadUser.email);
			expect(storedUser.role).toBe(payloadUser.role);
		});
	});

	describe('DELETE /users/:id', () => {
		it('if not authenticated, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwner({ withApiKey: false });
			const member = await createMember();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).delete(`/users/${member.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const firstMember = await createMember({ withApiKey: true });
			const secondMember = await createMember();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(firstMember)
				.delete(`/users/${secondMember.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('should delete a user', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwner({ withApiKey: true });
			const member = await createMember();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).delete(`/users/${member.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(204);
			await expect(getUserById(member.id)).rejects.toThrow();
		});
	});

	describe('PATCH /users/:id/role', () => {
		it('if not authenticated, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwner({ withApiKey: false });
			const member = await createMember();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).patch(`/users/${member.id}/role`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwner({ withApiKey: true });
			const member = await createMember();
			const payload = { newRoleName: 'global:admin' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:advancedPermissions').message,
			);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const firstMember = await createMember({ withApiKey: true });
			const secondMember = await createMember();
			const payload = { newRoleName: 'global:admin' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(firstMember)
				.patch(`/users/${secondMember.id}/role`)
				.send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it("should change a user's role", async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwner({ withApiKey: true });
			const member = await createMember();
			const payload = { newRoleName: 'global:admin' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(204);
			const storedUser = await getUserById(member.id);
			expect(storedUser.role).toBe(payload.newRoleName);
		});
	});
});
