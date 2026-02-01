import { ALL_SCOPES } from '@n8n/permissions';

import { UpdateRoleDto } from '../update-role.dto';

describe('updateRoleDtoSchema', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty object (all fields optional)',
				request: {},
			},
			{
				name: 'only displayName',
				request: {
					displayName: 'Updated Role Name',
				},
			},
			{
				name: 'only description',
				request: {
					description: 'Updated role description',
				},
			},
			{
				name: 'only scopes',
				request: {
					scopes: ['project:read', 'workflow:execute'],
				},
			},
			{
				name: 'displayName and description',
				request: {
					displayName: 'Updated Custom Role',
					description: 'An updated description for the role',
				},
			},
			{
				name: 'displayName and scopes',
				request: {
					displayName: 'Enhanced Role',
					scopes: ['project:*', 'workflow:read'],
				},
			},
			{
				name: 'description and scopes',
				request: {
					description: 'Role with updated permissions',
					scopes: ['credential:read', 'user:list'],
				},
			},
			{
				name: 'all fields',
				request: {
					displayName: 'Completely Updated Role',
					description: 'A role with all fields updated',
					scopes: ['project:create', 'workflow:execute', 'credential:share'],
				},
			},
			{
				name: 'displayName at minimum length',
				request: {
					displayName: 'Up',
				},
			},
			{
				name: 'displayName at maximum length',
				request: {
					displayName: 'B'.repeat(100),
				},
			},
			{
				name: 'description at maximum length',
				request: {
					description: 'C'.repeat(500),
				},
			},
			{
				name: 'empty description string',
				request: {
					description: '',
				},
			},
			{
				name: 'single scope',
				request: {
					scopes: ['project:read'],
				},
			},
			{
				name: 'multiple scopes',
				request: {
					scopes: [
						'project:create',
						'project:read',
						'project:update',
						'workflow:execute',
						'credential:share',
					],
				},
			},
			{
				name: 'wildcard scopes',
				request: {
					scopes: ['project:*', 'workflow:*'],
				},
			},
			{
				name: 'global wildcard scope',
				request: {
					scopes: ['*'],
				},
			},
			{
				name: 'empty scopes array',
				request: {
					scopes: [],
				},
			},
			{
				name: 'various resource scopes',
				request: {
					scopes: [
						'credential:read',
						'workflow:execute',
						'user:list',
						'tag:create',
						'variable:update',
						'folder:move',
					],
				},
			},
			{
				name: 'with extra fields (should be allowed)',
				request: {
					displayName: 'Test Role',
					extraField: 'this is allowed by default zod behavior',
				},
			},
			{
				name: 'with roleType field (ignored but allowed)',
				request: {
					displayName: 'Test Role',
					roleType: 'project',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateRoleDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'displayName too short',
				request: {
					displayName: 'A',
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName too long',
				request: {
					displayName: 'A'.repeat(101),
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'empty displayName',
				request: {
					displayName: '',
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName as number',
				request: {
					displayName: 123,
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName as boolean',
				request: {
					displayName: true,
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName as object',
				request: {
					displayName: { name: 'test' },
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName as array',
				request: {
					displayName: ['test'],
				},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'description too long',
				request: {
					description: 'A'.repeat(501),
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'description as number',
				request: {
					description: 123,
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'description as boolean',
				request: {
					description: false,
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'description as object',
				request: {
					description: { desc: 'test' },
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'description as array',
				request: {
					description: ['test'],
				},
				expectedErrorPath: ['description'],
			},
			{
				name: 'scopes as string instead of array',
				request: {
					scopes: 'project:read',
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes as number',
				request: {
					scopes: 123,
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes as boolean',
				request: {
					scopes: true,
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes as object',
				request: {
					scopes: { scope: 'project:read' },
				},
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'invalid scope in array',
				request: {
					scopes: ['project:read', 'invalid:scope'],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'scope as number in array',
				request: {
					scopes: ['project:read', 123],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'scope as boolean in array',
				request: {
					scopes: ['project:read', false],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'scope as object in array',
				request: {
					scopes: ['project:read', { scope: 'workflow:read' }],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'scope as array in array',
				request: {
					scopes: ['project:read', ['workflow:read']],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'malformed scope format',
				request: {
					scopes: ['project_read', 'workflow-create'],
				},
				expectedErrorPath: ['scopes', 0],
			},
			{
				name: 'empty scope string',
				request: {
					scopes: ['project:read', ''],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'null in scopes array',
				request: {
					scopes: ['project:read', null],
				},
				expectedErrorPath: ['scopes', 1],
			},
			{
				name: 'undefined in scopes array',
				request: {
					scopes: ['project:read', undefined],
				},
				expectedErrorPath: ['scopes', 1],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateRoleDto.safeParse(request);

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
					scopes: [scope],
				};

				const result = UpdateRoleDto.safeParse(request);
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
					scopes: [scope],
				};

				const result = UpdateRoleDto.safeParse(request);
				expect(result.success).toBe(false);
			}
		});

		test('should handle mixed valid and invalid scopes', () => {
			const request = {
				scopes: ['project:read', 'invalid-scope', 'workflow:execute'],
			};

			const result = UpdateRoleDto.safeParse(request);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['scopes', 1]);
		});
	});

	describe('Field combination tests', () => {
		test('should validate partial updates with different field combinations', () => {
			const validCombinations = [
				{ displayName: 'New Name' },
				{ description: 'New description' },
				{ scopes: ['project:read'] },
				{ displayName: 'New Name', description: 'New description' },
				{ displayName: 'New Name', scopes: ['workflow:execute'] },
				{ description: 'New description', scopes: ['credential:share'] },
				{
					displayName: 'Complete Update',
					description: 'Full update description',
					scopes: ['*'],
				},
			];

			for (const request of validCombinations) {
				const result = UpdateRoleDto.safeParse(request);
				expect(result.success).toBe(true);
			}
		});

		test('should handle boundary conditions in combinations', () => {
			const request = {
				displayName: 'AB', // minimum length
				description: 'D'.repeat(500), // maximum length
				scopes: ['*'], // global wildcard
			};

			const result = UpdateRoleDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Null and undefined handling', () => {
		test.each([
			{
				name: 'null displayName',
				request: { displayName: null },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'null description',
				request: { description: null },
				expectedErrorPath: ['description'],
			},
			{
				name: 'null scopes',
				request: { scopes: null },
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'undefined displayName',
				request: { displayName: undefined },
			},
			{
				name: 'undefined description',
				request: { description: undefined },
			},
			{
				name: 'undefined scopes',
				request: { scopes: undefined },
			},
		])('should handle $name correctly', ({ request, expectedErrorPath }) => {
			const result = UpdateRoleDto.safeParse(request);

			if (expectedErrorPath) {
				expect(result.success).toBe(false);
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			} else {
				// undefined values should be valid (fields are optional)
				expect(result.success).toBe(true);
			}
		});
	});
});
