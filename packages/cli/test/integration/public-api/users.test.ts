import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { Telemetry } from '@/telemetry';
import { mockInstance } from '@test/mocking';
import {
	createMember,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	getUserById,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import * as testDb from '../shared/test-db';

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
			const payload = { email: 'test@test.com', role: 'global:admin' };

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentWithApiKey('').post('/users').send(payload);

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
			const member = await createMemberWithApiKey();
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
			const owner = await createOwnerWithApiKey();
			await createOwnerWithApiKey();
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
			const member = await createMember();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentWithApiKey('').delete(`/users/${member.id}`);

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
			const member = await createMemberWithApiKey();
			const secondMember = await createMember();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(member)
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
			const owner = await createOwnerWithApiKey();
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
			const member = await createMember();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentWithApiKey('')
				.patch(`/users/${member.id}/role`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwnerWithApiKey();
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
			const member = await createMemberWithApiKey();
			const secondMember = await createMember();
			const payload = { newRoleName: 'global:admin' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(member)
				.patch(`/users/${secondMember.id}/role`)
				.send(payload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('should return a 400 on invalid payload', async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			const payload = { newRoleName: 'invalid' };

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
			expect(response.status).toBe(400);
		});

		it("should change a user's role", async () => {
			/**
			 * Arrange
			 */
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
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
