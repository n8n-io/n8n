import { testDb } from '@n8n/backend-test-utils';
import { RoleRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { addApiKey, createOwnerWithApiKey, createUser } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Roles in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:customRoles'],
	});

	// A user whose custom GLOBAL role grants only role:manageProject (not role:manage).
	// Its API key derives role:manageProject, so it can create project roles but not global ones.
	const makeManageProjectUserAgent = async () => {
		const role = await createCustomRoleWithScopeSlugs(['role:read', 'role:manageProject'], {
			roleType: 'global',
		});
		const user = await createUser({ role });
		user.apiKeys = [await addApiKey(user)];
		return testServer.publicApiAgentFor(user);
	};

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		// Truncate users first so the cleanup below can delete custom roles they referenced.
		await testDb.truncate(['User']);
		await Container.get(RoleRepository).delete({ systemRole: false });
		owner = await createOwnerWithApiKey();
	});

	describe('POST /roles', () => {
		it('creates a global role and returns 201', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({
					displayName: 'PA global role',
					roleType: 'global',
					scopes: ['user:read', 'user:list'],
				});

			expect(response.status).toBe(201);
			// Full-shape assertion also proves no extra fields leak (e.g. usedByUsers).
			expect(response.body).toEqual({
				slug: expect.stringMatching(/^global:.+-[a-z0-9]{6}$/),
				displayName: 'PA global role',
				description: null,
				systemRole: false,
				roleType: 'global',
				scopes: expect.arrayContaining(['user:read', 'user:list']),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(response.body.scopes).toHaveLength(2);
		});

		it('creates a project role and returns 201', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({
					displayName: 'PA project role',
					roleType: 'project',
					scopes: ['workflow:read'],
				});

			expect(response.status).toBe(201);
			expect(response.body.slug).toMatch(/^project:.+-[a-z0-9]{6}$/);
			expect(response.body.roleType).toBe('project');
			expect(response.body.scopes).toEqual(['workflow:read']);
		});

		it('creates a role with no scopes and returns 201 (matches internal behaviour)', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA empty role', roleType: 'global', scopes: [] });

			expect(response.status).toBe(201);
			expect(response.body.scopes).toEqual([]);
		});

		it('lets a role:manageProject key create a project role (201)', async () => {
			const agent = await makeManageProjectUserAgent();

			const response = await agent
				.post('/roles')
				.send({ displayName: 'MP project role', roleType: 'project', scopes: ['workflow:read'] });

			expect(response.status).toBe(201);
			expect(response.body.roleType).toBe('project');
		});

		it('forbids a role:manageProject key from creating a global role (403)', async () => {
			const agent = await makeManageProjectUserAgent();

			const response = await agent
				.post('/roles')
				.send({ displayName: 'MP global role', roleType: 'global', scopes: ['user:read'] });

			expect(response.status).toBe(403);
		});

		it('rejects an unknown scope slug with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA bad slug', roleType: 'global', scopes: ['not:a-real-scope'] });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('Invalid scope');
		});

		it('rejects a scope not allowed for the role type with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA wrong scope', roleType: 'global', scopes: ['workflow:read'] });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not allowed for global roles');
		});

		it('rejects a too-short displayName with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'a', roleType: 'global', scopes: ['user:read'] });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('at least 2');
		});

		it('rejects a duplicate role name with 400', async () => {
			const body = {
				displayName: 'PA duplicate role',
				roleType: 'global',
				scopes: ['user:read'],
			};

			const first = await testServer.publicApiAgentFor(owner).post('/roles').send(body);
			expect(first.status).toBe(201);

			const second = await testServer.publicApiAgentFor(owner).post('/roles').send(body);
			expect(second.status).toBe(400);
			expect(second.body.message).toContain('already exists');
		});

		it('rejects with 401 without an API key', async () => {
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/roles')
				.send({ displayName: 'PA no key', roleType: 'global', scopes: ['user:read'] });

			expect(response.status).toBe(401);
		});

		it('rejects with 401 with an invalid API key', async () => {
			const response = await testServer
				.publicApiAgentWithApiKey('invalid-key')
				.post('/roles')
				.send({ displayName: 'PA bad key', roleType: 'global', scopes: ['user:read'] });

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks a role scope', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post('/roles')
				.send({ displayName: 'PA no scope', roleType: 'global', scopes: ['user:read'] });

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when the custom roles feature is not licensed', async () => {
			testServer.license.disable('feat:customRoles');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA unlicensed', roleType: 'global', scopes: ['user:read'] });

			expect(response.status).toBe(403);

			testServer.license.enable('feat:customRoles');
		});
	});
});
