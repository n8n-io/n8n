import { ALL_SCOPES } from '@n8n/permissions';

import { CreateRoleDto } from '../create-role.dto';

describe('createRoleDtoSchema', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'minimal valid request',
				request: {
					displayName: 'My Role',
					roleType: 'project',
					scopes: ['project:read'],
				},
			},
			{
				name: 'with description',
				request: {
					displayName: 'Custom Project Role',
					description: 'A role for managing specific project tasks',
					roleType: 'project',
					scopes: ['project:read', 'project:update'],
				},
			},
			{
				name: 'with multiple scopes',
				request: {
					displayName: 'Full Access Role',
					description: 'Complete project access',
					roleType: 'project',
					scopes: [
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'workflow:create',
						'workflow:read',
					],
				},
			},
			{
				name: 'with wildcard scopes',
				request: {
					displayName: 'Admin Role',
					roleType: 'project',
					scopes: ['project:*', 'workflow:*'],
				},
			},
			{
				name: 'with global wildcard scope',
				request: {
					displayName: 'Super Admin',
					roleType: 'project',
					scopes: ['*'],
				},
			},
			{
				name: 'displayName at minimum length',
				request: {
					displayName: 'My',
					roleType: 'project',
					scopes: ['project:read'],
				},
			},
			{
				name: 'displayName at maximum length',
				request: {
					displayName: 'A'.repeat(100),
					roleType: 'project',
					scopes: ['project:read'],
				},
			},
			{
				name: 'description at maximum length',
				request: {
					displayName: 'Test Role',
					description: 'A'.repeat(500),
					roleType: 'project',
					scopes: ['project:read'],
				},
			},
			{
				name: 'empty description string',
				request: {
					displayName: 'Test Role',
					description: '',
					roleType: 'project',
					scopes: ['project:read'],
				},
			},
			{
				name: 'with various resource scopes',
				request: {
					displayName: 'Multi-Resource Role',
					roleType: 'project',
					scopes: [
						'credential:read',
						'workflow:execute',
						'user:list',
						'tag:create',
						'variable:update',
					],
				},
			},
			{
				name: 'with empty scopes array',
				request: {
					displayName: 'Role with no scopes',
					roleType: 'project',
					scopes: [],
				},
			},
			{
				name: 'with extra fields (should be allowed)',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read'],
					extraField: 'this is allowed by default zod behavior',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CreateRoleDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing displayName',
				request: {
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName too short',
				request: {
					displayName: 'A',
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName too long',
				request: {
					displayName: 'A'.repeat(101),
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'empty displayName',
				request: {
					displayName: '',
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName as number',
				request: {
					displayName: 123,
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'description too long',
				request: {
					displayName: 'Test Role',
					description: 'A'.repeat(501),
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'description as number',
				request: {
					displayName: 'Test Role',
					description: 123,
					roleType: 'project',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'missing roleType',
				request: {
					displayName: 'Test Role',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['roleType'],
			},
			{
				name: 'invalid roleType',
				request: {
					displayName: 'Test Role',
					roleType: 'invalid',
					scopes: ['project:read'],
				},
				expectedErrorPath: ['roleType'],
			},
			{
				name: 'roleType as number',
				request: {
					displayName: 'Test Role',
					roleType: 123,
					scopes: ['project:read'],
				},
				expectedErrorPath: ['roleType'],
			},
			{
				name: 'missing scopes',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes as string instead of array',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: 'project:read',
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes as number',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: 123,
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'invalid scope in array',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read', 'invalid:scope'],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'scope as number in array',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read', 123],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'scope as object in array',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read', { invalid: 'scope' }],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'malformed scope format',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project_read', 'workflow-create'],
				},
				expectedErrorPath: ['scopes', 0],
			},
			{
				name: 'empty scope string',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read', ''],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'null in scopes array',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read', null],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'undefined in scopes array',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
					scopes: ['project:read', undefined],
				},
				expectedErrorPath: ['scopes', 1],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = CreateRoleDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});

	describe('Scope validation integration', () => {
		test('should validate all valid resource scopes', () => {
			const validScopes = ALL_SCOPES;

			for (const scope of validScopes) {
				const request = {
					displayName: 'Test Role',
					roleType: 'project' as const,
					scopes: [scope],
				};

				const result = CreateRoleDto.safeParse(request);
				expect(result.success).toBe(true);
			}
		});

		test('should reject invalid scope formats', () => {
			const invalidScopes = [
				'invalid-scope',
				'project_read',
				'workflow-create',
				'project:invalid-operation',
				'invalid-resource:read',
				'project:',
				':read',
				'project::read',
				'**',
				'project:**',
			];

			for (const scope of invalidScopes) {
				const request = {
					displayName: 'Test Role',
					roleType: 'project' as const,
					scopes: [scope],
				};

				const result = CreateRoleDto.safeParse(request);
				expect(result.success).toBe(false);
			}
		});
	});
});
