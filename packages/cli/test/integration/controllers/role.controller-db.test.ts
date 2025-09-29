import type { CreateRoleDto, UpdateRoleDto } from '@n8n/api-types';
import { testDb } from '@n8n/backend-test-utils';

import { cleanupRolesAndScopes } from '../shared/db/roles';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';
import {
	PROJECT_ADMIN_ROLE,
	PROJECT_EDITOR_ROLE,
	PROJECT_OWNER_ROLE,
	PROJECT_VIEWER_ROLE,
} from '@n8n/db';

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
		// Enable CUSTOM_ROLES license for all tests by default
		testServer.license.enable('feat:customRoles');
	});

	afterEach(async () => {
		await cleanupRolesAndScopes();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each([PROJECT_ADMIN_ROLE, PROJECT_EDITOR_ROLE, PROJECT_VIEWER_ROLE, PROJECT_OWNER_ROLE])(
		'should return 200 and the role data for role $slug',
		async (role) => {
			//
			// ACT
			//
			const response = await memberAgent.get(`/roles/${role.slug}`).expect(200);

			//
			// ASSERT
			//
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
		},
	);

	it('should create a custom role', async () => {
		//
		// ARRANGE
		//
		const createRoleDto: CreateRoleDto = {
			displayName: 'Custom Project Role',
			description: 'A custom role for project management',
			roleType: 'project',
			scopes: ['workflow:read', 'workflow:create'].sort(),
		};

		//
		// ACT
		//
		const response = await ownerAgent.post('/roles').send(createRoleDto).expect(200);

		//
		// ASSERT
		//
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

	it('should update a custom role', async () => {
		//
		// ARRANGE
		//
		const createRoleDto: CreateRoleDto = {
			displayName: 'Custom Project Role',
			description: 'A custom role for project management',
			roleType: 'project',
			scopes: ['workflow:read', 'workflow:create'].sort(),
		};

		const createResponse = await ownerAgent.post('/roles').send(createRoleDto).expect(200);

		expect(createResponse.body?.data?.slug).toBeDefined();
		const generatedRoleSlug = createResponse.body.data.slug;

		const updateRoleDto: UpdateRoleDto = {
			displayName: 'Custom Project Role Updated',
			description: 'A custom role for project management - updated',
		};

		//
		// ACT
		//
		const response = await ownerAgent
			.patch(`/roles/${generatedRoleSlug}`)
			.send(updateRoleDto)
			.expect(200);

		//
		// ASSERT
		//
		response.body.data.scopes.sort();
		expect(response.body).toEqual({
			data: {
				...updateRoleDto,
				scopes: ['workflow:read', 'workflow:create'].sort(),
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
				scopes: ['workflow:read', 'workflow:create'].sort(),
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
