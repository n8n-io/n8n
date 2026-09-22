import { testDb, mockInstance } from '@n8n/backend-test-utils';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { Telemetry } from '@/telemetry';
import { createRole } from '@test-integration/db/roles';
import {
	createMember,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	getUserById,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Users in Public API', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

	mockInstance(Telemetry);

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	describe('GET /users', () => {
		it('if not authenticated, should reject', async () => {
			const response = await testServer.publicApiAgentWithApiKey('').get('/users');

			expect(response.status).toBe(401);
		});

		it('if missing scope, should reject', async () => {
			const memberWithoutScope = await createMemberWithApiKey({ scopes: ['user:read'] });

			const response = await testServer.publicApiAgentFor(memberWithoutScope).get('/users');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('with a non-numeric limit, should reject', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/users')
				.query({ limit: 'abc' });

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: 'request/query/limit Param `limit` must be a valid integer',
			});
		});

		it('with an invalid includeRole, should reject', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/users')
				.query({ includeRole: 'not-a-boolean' });

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message:
					"request/query/includeRole Invalid enum value. Expected 'true' | 'false', received 'not-a-boolean'",
			});
		});

		it('should reject an invalid cursor', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/users')
				.query({ cursor: 'not-a-cursor' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message', 'An invalid cursor was provided');
		});

		it('should return users with roles', async () => {
			const owner = await createOwnerWithApiKey();
			const includeRole = true;

			await createMember();
			await createMember();
			await createMember();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/users')
				.query({ includeRole });

			expect(response.status).toBe(200);
			const { data: users } = response.body;

			expect(users).toHaveLength(4);
			users.forEach((user: any) => {
				expect(user).toHaveProperty('id');
				expect(user).toHaveProperty('email');
				expect(user).toHaveProperty('firstName');
				expect(user).toHaveProperty('lastName');
				expect(user).toHaveProperty('createdAt');
				expect(user).toHaveProperty('updatedAt');
				expect(user).toHaveProperty('isPending');
				expect(user).toHaveProperty('role');
				expect(user).toHaveProperty('mfaEnabled');
			});

			const members = users.filter((user: any) => user.role === 'global:member');
			expect(members).toHaveLength(3);
			const owners = users.filter((user: any) => user.role === 'global:owner');
			expect(owners).toHaveLength(1);
		});

		it('should return mfaEnabled status for users', async () => {
			const owner = await createOwnerWithApiKey();
			const memberWithMfa = await createMember();
			// Manually enable MFA for this member
			const userRepository = (await import('@n8n/db')).UserRepository;
			const { Container } = await import('@n8n/di');
			await Container.get(userRepository).update(memberWithMfa.id, { mfaEnabled: true });

			const memberWithoutMfa = await createMember();

			const response = await testServer.publicApiAgentFor(owner).get('/users');

			expect(response.status).toBe(200);
			const { data: users } = response.body;

			const userWithMfa = users.find((u: any) => u.id === memberWithMfa.id);
			const userWithoutMfa = users.find((u: any) => u.id === memberWithoutMfa.id);

			expect(userWithMfa).toHaveProperty('mfaEnabled', true);
			expect(userWithoutMfa).toHaveProperty('mfaEnabled', false);
		});
	});

	describe('GET /users/:id', () => {
		it('if not authenticated, should reject', async () => {
			const member = await createMember();

			const response = await testServer.publicApiAgentWithApiKey('').get(`/users/${member.id}`);

			expect(response.status).toBe(401);
		});

		it('should return a user with role', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			const includeRole = true;

			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/users/${member.id}`)
				.query({ includeRole });

			expect(response.status).toBe(200);
			const returnedUser = response.body;

			expect(returnedUser).toHaveProperty('id', member.id);
			expect(returnedUser).toHaveProperty('email', member.email);
			expect(returnedUser).toHaveProperty('firstName', member.firstName);
			expect(returnedUser).toHaveProperty('lastName', member.lastName);
			expect(returnedUser).toHaveProperty('createdAt');
			expect(returnedUser).toHaveProperty('updatedAt');
			expect(returnedUser).toHaveProperty('isPending', member.isPending);
			expect(returnedUser).toHaveProperty('role', 'global:member');
			expect(returnedUser).toHaveProperty('mfaEnabled', false);
		});

		it('should return mfaEnabled status for a single user', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			// Enable MFA for this member
			const userRepository = (await import('@n8n/db')).UserRepository;
			const { Container } = await import('@n8n/di');
			await Container.get(userRepository).update(member.id, { mfaEnabled: true });

			const response = await testServer.publicApiAgentFor(owner).get(`/users/${member.id}`);

			expect(response.status).toBe(200);
			const returnedUser = response.body;

			expect(returnedUser).toHaveProperty('mfaEnabled', true);
		});

		it('if the identifier is neither a valid ID nor a valid email, should reject', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer.publicApiAgentFor(owner).get('/users/not-an-id');

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: 'request/params/userId must be a valid ID or email',
			});
		});
	});

	describe('POST /users', () => {
		it('if not authenticated, should reject', async () => {
			const payload = { email: 'test@test.com', role: 'global:admin' };

			const response = await testServer.publicApiAgentWithApiKey('').post('/users').send(payload);

			expect(response.status).toBe(401);
		});

		it('if missing scope, should reject', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const member = await createMemberWithApiKey();
			const payload = [{ email: 'test@test.com', role: 'global:admin' }];

			const response = await testServer.publicApiAgentFor(member).post('/users').send(payload);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('should fail if role does not exist', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
			const payload = [{ email: 'test@test.com', role: 'non-existing-role' }];

			const response = await testServer.publicApiAgentFor(owner).post('/users').send(payload);

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message', 'Role non-existing-role does not exist');
		});

		it('should create a user', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
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

			const storedUser = await getUserById(returnedUser.id);
			expect(returnedUser.id).toBe(storedUser.id);
			expect(returnedUser.email).toBe(storedUser.email);
			expect(returnedUser.email).toBe(payloadUser.email);
			expect(storedUser.role.slug).toBe(payloadUser.role);
		});

		it('should create a user with an existing custom role', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
			const customRole = 'custom:role';
			await createRole({ slug: customRole, displayName: 'Custom role', roleType: 'global' });
			const payload = [{ email: 'test@test.com', role: customRole }];

			const response = await testServer.publicApiAgentFor(owner).post('/users').send(payload);

			expect(response.status).toBe(201);
		});
	});

	describe('DELETE /users/:id', () => {
		it('if not authenticated, should reject', async () => {
			const member = await createMember();

			const response = await testServer.publicApiAgentWithApiKey('').delete(`/users/${member.id}`);

			expect(response.status).toBe(401);
		});

		it('if missing scope, should reject', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const member = await createMemberWithApiKey();
			const secondMember = await createMember();

			const response = await testServer
				.publicApiAgentFor(member)
				.delete(`/users/${secondMember.id}`);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		it('should delete a user', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
			const member = await createMember();

			const response = await testServer.publicApiAgentFor(owner).delete(`/users/${member.id}`);

			expect(response.status).toBe(204);
			await expect(getUserById(member.id)).rejects.toThrow();
		});
	});

	describe('PATCH /users/:id/role', () => {
		it('if not authenticated, should reject', async () => {
			const member = await createMember();

			const response = await testServer
				.publicApiAgentWithApiKey('')
				.patch(`/users/${member.id}/role`);

			expect(response.status).toBe(401);
		});

		it('if not licensed, should reject', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			const payload = { newRoleName: 'global:admin' };

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:advancedPermissions').message,
			);
		});

		it('if missing scope, should reject', async () => {
			testServer.license.enable('feat:advancedPermissions');
			const member = await createMemberWithApiKey();
			const secondMember = await createMember();
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
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			const payload = { newRoleName: 'invalid' };

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);

			expect(response.status).toBe(400);
		});

		it("should change a user's role", async () => {
			testServer.license.enable('feat:advancedPermissions');
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			const payload = { newRoleName: 'global:admin' };

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);

			expect(response.status).toBe(204);
			const storedUser = await getUserById(member.id);
			expect(storedUser.role.slug).toBe(payload.newRoleName);
		});

		it('should change a user role to an existing custom role', async () => {
			testServer.license.enable('feat:advancedPermissions');
			testServer.license.enable('feat:customRoles');
			const owner = await createOwnerWithApiKey();
			const member = await createMember();
			const customRole = 'custom:role';
			await createRole({ slug: customRole, displayName: 'Custom role', roleType: 'global' });
			const payload = { newRoleName: customRole };

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/users/${member.id}/role`)
				.send(payload);

			expect(response.status).toBe(204);
			const storedUser = await getUserById(member.id);
			expect(storedUser.role.slug).toBe(payload.newRoleName);
		});
	});
});
