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

	describe('PATCH /roles/{slug}', () => {
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

		it('updates the displayName only, leaving description and scopes unchanged', async () => {
			const role = await createGlobalRole('PA patch displayName', ['user:read', 'user:list']);

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'PA patched displayName' });

			expect(response.status).toBe(200);
			expect(response.body.displayName).toBe('PA patched displayName');
			expect(response.body.description).toBeNull();
			expect(response.body.scopes).toEqual(expect.arrayContaining(['user:read', 'user:list']));
		});

		it('replaces scopes rather than merging them', async () => {
			const role = await createGlobalRole('PA patch scopes', ['user:read', 'user:list']);

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ scopes: ['user:read'] });

			expect(response.status).toBe(200);
			expect(response.body.scopes).toEqual(['user:read']);
		});

		it('updates displayName, description, and scopes together and returns the full public shape', async () => {
			const role = await createGlobalRole('PA patch all fields');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({
					displayName: 'PA patched all fields',
					description: 'An updated description',
					scopes: ['user:read', 'user:list'],
				});

			expect(response.status).toBe(200);
			// Full-shape assertion also proves no extra fields leak (e.g. licensed, usedByUsers).
			expect(response.body).toEqual({
				slug: role.slug,
				displayName: 'PA patched all fields',
				description: 'An updated description',
				systemRole: false,
				roleType: 'global',
				scopes: expect.arrayContaining(['user:read', 'user:list']),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(response.body.scopes).toHaveLength(2);
		});

		it('leaves the role unchanged when the body is empty', async () => {
			const role = await createGlobalRole('PA patch empty body');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({});

			expect(response.status).toBe(200);
			expect(response.body.displayName).toBe(role.displayName);
			expect(response.body.description).toBe(role.description);
			expect(response.body.scopes).toEqual(role.scopes);
		});

		it('lets a role:manageProject key update a project role (200)', async () => {
			const agent = await makeManageProjectUserAgent();
			const created = await agent.post('/roles').send({
				displayName: 'MP patch project role',
				roleType: 'project',
				scopes: ['workflow:read'],
			});
			expect(created.status).toBe(201);

			const response = await agent
				.patch(`/roles/${created.body.slug}`)
				.send({ displayName: 'MP patched project role' });

			expect(response.status).toBe(200);
			expect(response.body.displayName).toBe('MP patched project role');
		});

		it('forbids a role:manageProject key from updating a global role (403)', async () => {
			const role = await createGlobalRole('PA global role for MP patch test');
			const agent = await makeManageProjectUserAgent();

			const response = await agent
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'MP should not patch this' });

			expect(response.status).toBe(403);
		});

		it('returns 404 for an unknown slug', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch('/roles/global:does-not-exist')
				.send({ displayName: 'Does not matter' });

			expect(response.status).toBe(404);
		});

		it('returns 404 for a role type not exposed by the public API (e.g. credential)', async () => {
			const credentialRole = await createRole({ roleType: 'credential', scopes: [] });

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${credentialRole.slug}`)
				.send({ displayName: 'Should not be reachable' });

			expect(response.status).toBe(404);
		});

		it('rejects updating a system role with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch('/roles/global:owner')
				.send({ displayName: 'Renamed owner role' });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('Cannot update system roles');
		});

		it('rejects an unknown scope slug with 400', async () => {
			const role = await createGlobalRole('PA patch bad slug');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ scopes: ['not:a-real-scope'] });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('Invalid scope');
		});

		it('rejects a scope not allowed for the role type with 400', async () => {
			const role = await createGlobalRole('PA patch wrong scope');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ scopes: ['workflow:read'] });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not allowed for global roles');
		});

		it('rejects a too-short displayName with 400', async () => {
			const role = await createGlobalRole('PA patch short name');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'a' });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('at least 2');
		});

		it('rejects renaming onto an existing role name with 400', async () => {
			await createGlobalRole('PA patch existing name');
			const role = await createGlobalRole('PA patch rename target');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'PA patch existing name' });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('already exists');
		});

		it('rejects with 401 without an API key', async () => {
			const role = await createGlobalRole('PA patch no key');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'Should not work' });

			expect(response.status).toBe(401);
		});

		it('rejects with 401 with an invalid API key', async () => {
			const role = await createGlobalRole('PA patch bad key');

			const response = await testServer
				.publicApiAgentWithApiKey('invalid-key')
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'Should not work' });

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks a role scope', async () => {
			const role = await createGlobalRole('PA patch no scope');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'Should not work' });

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when the custom roles feature is not licensed', async () => {
			const role = await createGlobalRole('PA patch unlicensed');
			testServer.license.disable('feat:customRoles');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/roles/${role.slug}`)
				.send({ displayName: 'Should not work' });

			expect(response.status).toBe(403);

			testServer.license.enable('feat:customRoles');
		});
	});
});
