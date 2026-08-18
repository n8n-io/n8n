import { testDb } from '@n8n/backend-test-utils';
import { RoleRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createCustomRoleWithScopeSlugs, createRole } from '@test-integration/db/roles';
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

	describe('GET /roles', () => {
		it('returns all roles grouped by type', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/roles');

			expect(response.status).toBe(200);
			expect(Object.keys(response.body).sort()).toEqual(['global', 'project']);

			const systemRole = (slug: string, roleType: string) => ({
				slug,
				displayName: expect.any(String),
				description: expect.any(String),
				systemRole: true,
				roleType,
				licensed: expect.any(Boolean),
				scopes: expect.any(Array),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(response.body.global).toContainEqual(systemRole('global:owner', 'global'));
			expect(response.body.project).toContainEqual(systemRole('project:admin', 'project'));
		});

		it('places a newly created custom role in its type group', async () => {
			await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA listed role', roleType: 'global', scopes: ['user:read'] });

			const response = await testServer.publicApiAgentFor(owner).get('/roles');

			expect(response.status).toBe(200);
			const custom = response.body.global.find(
				(r: { displayName: string }) => r.displayName === 'PA listed role',
			);
			expect(custom).toEqual({
				slug: expect.stringMatching(/^global:.+-[a-z0-9]{6}$/),
				displayName: 'PA listed role',
				description: null,
				systemRole: false,
				roleType: 'global',
				licensed: expect.any(Boolean),
				scopes: ['user:read'],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		const allRolesOf = (body: Record<string, Array<Record<string, unknown>>>) => [
			...body.global,
			...body.project,
		];

		it('omits usage counts by default', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/roles');

			expect(response.status).toBe(200);
			for (const role of allRolesOf(response.body)) {
				expect(role).not.toHaveProperty('usedByUsers');
				expect(role).not.toHaveProperty('usedByProjects');
			}
		});

		it('includes usage counts when withUsageCount is set', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/roles')
				.query({ withUsageCount: 'true' });

			expect(response.status).toBe(200);
			for (const role of allRolesOf(response.body)) {
				expect(role.usedByUsers).toBeGreaterThanOrEqual(0);
				expect(role.usedByProjects).toBeGreaterThanOrEqual(0);
			}
			// The owner holds the global:owner role, so its user count is at least 1.
			const ownerRole = response.body.global.find(
				(r: { slug: string }) => r.slug === 'global:owner',
			);
			expect(ownerRole.usedByUsers).toBeGreaterThanOrEqual(1);
		});

		it('rejects with 401 without an API key', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/roles');

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks the role:list scope', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/roles');

			expect(response.status).toBe(403);
		});
	});

	describe('GET /roles/:slug', () => {
		const systemRoleBody = (slug: string, roleType: string) => ({
			slug,
			displayName: expect.any(String),
			description: expect.any(String),
			systemRole: true,
			roleType,
			licensed: expect.any(Boolean),
			scopes: expect.any(Array),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});

		it('returns a system role with its scopes', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/roles/global:owner');

			expect(response.status).toBe(200);
			expect(response.body).toEqual(systemRoleBody('global:owner', 'global'));
			expect(response.body.scopes.length).toBeGreaterThan(0);
		});

		it('returns a newly created custom role', async () => {
			const created = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA get role', roleType: 'global', scopes: ['user:read'] });
			expect(created.status).toBe(201);

			const response = await testServer.publicApiAgentFor(owner).get(`/roles/${created.body.slug}`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				slug: created.body.slug,
				displayName: 'PA get role',
				description: null,
				systemRole: false,
				roleType: 'global',
				licensed: expect.any(Boolean),
				scopes: ['user:read'],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it('returns a project role', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/roles/project:admin');

			expect(response.status).toBe(200);
			expect(response.body).toEqual(systemRoleBody('project:admin', 'project'));
		});

		it('omits usage counts by default', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/roles/global:owner');

			expect(response.status).toBe(200);
			expect(response.body).not.toHaveProperty('usedByUsers');
			expect(response.body).not.toHaveProperty('usedByProjects');
		});

		it('includes usage counts when withUsageCount is set', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/roles/global:owner')
				.query({ withUsageCount: 'true' });

			expect(response.status).toBe(200);
			expect(response.body.usedByUsers).toBeGreaterThanOrEqual(1);
			expect(response.body.usedByProjects).toBeGreaterThanOrEqual(0);
		});

		it('returns 404 for an unknown slug', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/roles/global:does-not-exist');

			expect(response.status).toBe(404);
		});

		it('returns 404 for a non-public role type', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/roles/credential:owner');

			expect(response.status).toBe(404);
		});

		it('works when the custom roles feature is not licensed', async () => {
			testServer.license.disable('feat:customRoles');

			const response = await testServer.publicApiAgentFor(owner).get('/roles/global:owner');

			expect(response.status).toBe(200);

			testServer.license.enable('feat:customRoles');
		});

		it('rejects with 401 without an API key', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/roles/global:owner');

			expect(response.status).toBe(401);
		});

		it('rejects with 401 with an invalid API key', async () => {
			const response = await testServer
				.publicApiAgentWithApiKey('invalid-key')
				.get('/roles/global:owner');

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks the role:read scope', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['role:list'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/roles/global:owner');

			expect(response.status).toBe(403);
		});
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

	describe('PUT /roles/{slug}', () => {
		type CreatedRole = {
			slug: string;
			displayName: string;
			description: string | null;
			scopes: string[];
		};

		const createGlobalRole = async (
			displayName: string,
			scopes: string[] = ['user:read'],
		): Promise<CreatedRole> => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName, roleType: 'global', scopes });
			expect(response.status).toBe(201);
			return response.body;
		};

		const fullBody = (overrides: Partial<CreatedRole> = {}) => ({
			displayName: 'PA updated role',
			description: null,
			scopes: ['user:read'],
			...overrides,
		});

		it('replaces displayName, description, and scopes, returns the full public shape', async () => {
			const role = await createGlobalRole('PA put all fields');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(
					fullBody({
						displayName: 'PA put all fields updated',
						description: 'An updated description',
						scopes: ['user:read', 'user:list'],
					}),
				);

			expect(response.status).toBe(200);
			// Full-shape assertion also proves no extra fields leak (e.g. licensed, usedByUsers).
			expect(response.body).toEqual({
				slug: role.slug,
				displayName: 'PA put all fields updated',
				description: 'An updated description',
				systemRole: false,
				roleType: 'global',
				scopes: expect.arrayContaining(['user:read', 'user:list']),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(response.body.scopes).toHaveLength(2);
		});

		it('replaces scopes entirely rather than merging them with the existing set', async () => {
			const role = await createGlobalRole('PA put scopes', ['user:read', 'user:list']);

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: role.displayName, scopes: ['user:read'] }));

			expect(response.status).toBe(200);
			expect(response.body.scopes).toEqual(['user:read']);
		});

		it('clears an existing description by sending null', async () => {
			const created = await testServer
				.publicApiAgentFor(owner)
				.post('/roles')
				.send({ displayName: 'PA put clear description', roleType: 'global', scopes: [] });
			expect(created.status).toBe(201);
			const withDescription = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${created.body.slug}`)
				.send(
					fullBody({ displayName: created.body.displayName, description: 'Has a description' }),
				);
			expect(withDescription.body.description).toBe('Has a description');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${created.body.slug}`)
				.send(fullBody({ displayName: created.body.displayName, description: null }));

			expect(response.status).toBe(200);
			expect(response.body.description).toBeNull();
		});

		it('accepts a GET response of the role as a PUT body unchanged (round-trip)', async () => {
			const role = await createGlobalRole('PA put round trip', ['user:read', 'user:list']);
			const getResponse = await testServer.publicApiAgentFor(owner).get('/roles');
			const current = getResponse.body.global.find((r: { slug: string }) => r.slug === role.slug);

			const response = await testServer.publicApiAgentFor(owner).put(`/roles/${role.slug}`).send({
				displayName: current.displayName,
				description: current.description,
				scopes: current.scopes,
			});

			expect(response.status).toBe(200);
			expect(response.body.displayName).toBe(role.displayName);
			expect(response.body.description).toBeNull();
			expect(response.body.scopes).toEqual(expect.arrayContaining(['user:read', 'user:list']));
		});

		it('rejects a body missing a required field with 400', async () => {
			const role = await createGlobalRole('PA put missing field');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send({ displayName: 'PA put missing field updated', description: null });

			expect(response.status).toBe(400);
		});

		it('rejects an empty body with 400', async () => {
			const role = await createGlobalRole('PA put empty body');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send({});

			expect(response.status).toBe(400);
		});

		it('lets a role:manageProject key update a project role (200)', async () => {
			const agent = await makeManageProjectUserAgent();
			const created = await agent.post('/roles').send({
				displayName: 'MP put project role',
				roleType: 'project',
				scopes: ['workflow:read'],
			});
			expect(created.status).toBe(201);

			const response = await agent
				.put(`/roles/${created.body.slug}`)
				.send(fullBody({ displayName: 'MP put project role updated', scopes: ['workflow:read'] }));

			expect(response.status).toBe(200);
			expect(response.body.displayName).toBe('MP put project role updated');
		});

		it('forbids a role:manageProject key from updating a global role (403)', async () => {
			const role = await createGlobalRole('PA global role for MP put test');
			const agent = await makeManageProjectUserAgent();

			const response = await agent
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'MP should not put this' }));

			expect(response.status).toBe(403);
		});

		it('returns 404 for an unknown slug', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/roles/global:does-not-exist')
				.send(fullBody());

			expect(response.status).toBe(404);
		});

		it('returns 404 for a role type not exposed by the public API (e.g. credential)', async () => {
			const credentialRole = await createRole({ roleType: 'credential', scopes: [] });

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${credentialRole.slug}`)
				.send(fullBody({ displayName: 'Should not be reachable' }));

			expect(response.status).toBe(404);
		});

		it('rejects updating a system role with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/roles/global:owner')
				.send(fullBody({ displayName: 'Renamed owner role' }));

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('Cannot update system roles');
		});

		it('rejects an unknown scope slug with 400', async () => {
			const role = await createGlobalRole('PA put bad slug');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: role.displayName, scopes: ['not:a-real-scope'] }));

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('Invalid scope');
		});

		it('rejects a scope not allowed for the role type with 400', async () => {
			const role = await createGlobalRole('PA put wrong scope');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: role.displayName, scopes: ['workflow:read'] }));

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not allowed for global roles');
		});

		it('rejects a too-short displayName with 400', async () => {
			const role = await createGlobalRole('PA put short name');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'a' }));

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('at least 2');
		});

		it('rejects renaming onto an existing role name with 400', async () => {
			await createGlobalRole('PA put existing name');
			const role = await createGlobalRole('PA put rename target');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'PA put existing name' }));

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('already exists');
		});

		it('rejects with 401 without an API key', async () => {
			const role = await createGlobalRole('PA put no key');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'Should not work' }));

			expect(response.status).toBe(401);
		});

		it('rejects with 401 with an invalid API key', async () => {
			const role = await createGlobalRole('PA put bad key');

			const response = await testServer
				.publicApiAgentWithApiKey('invalid-key')
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'Should not work' }));

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks a role scope', async () => {
			const role = await createGlobalRole('PA put no scope');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'Should not work' }));

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when the custom roles feature is not licensed', async () => {
			const role = await createGlobalRole('PA put unlicensed');
			testServer.license.disable('feat:customRoles');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/roles/${role.slug}`)
				.send(fullBody({ displayName: 'Should not work' }));

			expect(response.status).toBe(403);

			testServer.license.enable('feat:customRoles');
		});
	});
});
