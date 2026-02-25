import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import { testDb } from '@n8n/backend-test-utils';
import {
	PROJECT_ADMIN_ROLE,
	PROJECT_EDITOR_ROLE,
	PROJECT_OWNER_ROLE,
	PROJECT_VIEWER_ROLE,
	RoleRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { cleanupRolesAndScopes } from '../shared/db/roles';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('RoleController - Integration Tests', () => {
	const testServer = setupTestServer({ endpointGroups: ['role'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.init();
		const owner = await createOwner();
		const member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member);
	});

	beforeEach(() => {
		testServer.license.enable('feat:customRoles');
	});

	afterEach(async () => {
		await cleanupRolesAndScopes();
		await Container.get(RoleRepository).delete({ systemRole: false });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('GET /roles/:slug', () => {
		const staticRoles = [PROJECT_ADMIN_ROLE, PROJECT_EDITOR_ROLE, PROJECT_VIEWER_ROLE];

		it.each(staticRoles)('should return 200 and the role data for role $slug', async (role) => {
			const response = await memberAgent.get(`/roles/${role.slug}`).expect(200);

			response.body.data.scopes.sort();
			expect(response.body).toEqual({
				data: {
					slug: role.slug,
					displayName: role.displayName,
					description: role.description,
					systemRole: role.systemRole,
					roleType: role.roleType,
					scopes: role.scopes.map((scope) => scope.slug).sort(),
					licensed: expect.any(Boolean),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			});
		});

		it('should return 200 and the role data for PROJECT_OWNER_ROLE with dynamic scopes', async () => {
			// PROJECT_OWNER_ROLE has conditional scopes based on security settings.
			// The workflow:publish scope is dynamically added/removed based on the
			// personal space publishing setting. We fetch the actual role from the
			// database to get the current scopes.
			const roleRepository = Container.get(RoleRepository);
			const dbRole = await roleRepository.findBySlug(PROJECT_OWNER_ROLE.slug);
			expect(dbRole).not.toBeNull();

			const response = await memberAgent.get(`/roles/${PROJECT_OWNER_ROLE.slug}`).expect(200);

			response.body.data.scopes.sort();
			const expectedScopes = dbRole!.scopes.map((scope) => scope.slug).sort();

			expect(response.body).toEqual({
				data: {
					slug: PROJECT_OWNER_ROLE.slug,
					displayName: PROJECT_OWNER_ROLE.displayName,
					description: PROJECT_OWNER_ROLE.description,
					systemRole: PROJECT_OWNER_ROLE.systemRole,
					roleType: PROJECT_OWNER_ROLE.roleType,
					scopes: expectedScopes,
					licensed: expect.any(Boolean),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			});
		});
	});

	describe('POST /roles', () => {
		it('should create a custom role', async () => {
			const createRoleDto: CreateRoleDto = {
				displayName: 'Custom Project Role',
				description: 'A custom role for project management',
				roleType: 'project',
				scopes: ['workflow:create', 'workflow:read'].sort(),
			};

			const response = await ownerAgent.post('/roles').send(createRoleDto).expect(200);

			response.body.data.scopes.sort();
			expect(response.body).toEqual({
				data: {
					...createRoleDto,
					slug: expect.any(String),
					licensed: expect.any(Boolean),
					systemRole: false,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			});

			const availableRole = await memberAgent.get(`/roles/${response.body.data.slug}`).expect(200);

			availableRole.body.data.scopes.sort();
			expect(availableRole.body).toEqual({
				data: {
					...createRoleDto,
					slug: response.body.data.slug,
					licensed: expect.any(Boolean),
					systemRole: false,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			});
		});
	});

	describe('PATCH /roles/:slug', () => {
		it('should update a custom role', async () => {
			const createRoleDto: CreateRoleDto = {
				displayName: 'Custom Project Role',
				description: 'A custom role for project management',
				roleType: 'project',
				scopes: ['workflow:create', 'workflow:read'].sort(),
			};

			const createResponse = await ownerAgent.post('/roles').send(createRoleDto).expect(200);

			expect(createResponse.body?.data?.slug).toBeDefined();
			const generatedRoleSlug = createResponse.body.data.slug;

			const updateRoleDto: UpdateRoleDto = {
				displayName: 'Custom Project Role Updated',
				description: 'A custom role for project management - updated',
			};

			const response = await ownerAgent
				.patch(`/roles/${generatedRoleSlug}`)
				.send(updateRoleDto)
				.expect(200);

			response.body.data.scopes.sort();
			expect(response.body).toEqual({
				data: {
					...updateRoleDto,
					scopes: ['workflow:create', 'workflow:read'].sort(),
					slug: generatedRoleSlug,
					roleType: 'project',
					licensed: expect.any(Boolean),
					systemRole: false,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			});

			const availableRole = await memberAgent.get(`/roles/${response.body.data.slug}`).expect(200);

			availableRole.body.data.scopes.sort();
			expect(availableRole.body).toEqual({
				data: {
					...updateRoleDto,
					scopes: ['workflow:create', 'workflow:read'].sort(),
					slug: generatedRoleSlug,
					roleType: 'project',
					licensed: expect.any(Boolean),
					systemRole: false,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			});
		});
	});
});
