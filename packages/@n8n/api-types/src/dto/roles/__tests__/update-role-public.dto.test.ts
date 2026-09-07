import assert from 'node:assert';

import { UpdateRolePublicDto } from '../update-role-public.dto';

describe('updateRolePublicDtoSchema', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'full catalog of fields',
				request: {
					displayName: 'Updated Role Name',
					description: 'Updated role description',
					scopes: ['project:read', 'workflow:execute'],
				},
			},
			{
				name: 'null description',
				request: {
					displayName: 'Updated Role Name',
					description: null,
					scopes: ['project:read'],
				},
			},
			{
				name: 'empty scopes array (clears all scopes)',
				request: {
					displayName: 'Updated Role Name',
					description: null,
					scopes: [],
				},
			},
			{
				name: 'displayName at minimum length',
				request: {
					displayName: 'Up',
					description: null,
					scopes: [],
				},
			},
			{
				name: 'displayName at maximum length',
				request: {
					displayName: 'B'.repeat(100),
					description: null,
					scopes: [],
				},
			},
			{
				name: 'description at maximum length',
				request: {
					displayName: 'Updated Role Name',
					description: 'C'.repeat(500),
					scopes: [],
				},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateRolePublicDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing displayName',
				request: { description: null, scopes: [] },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'missing description',
				request: { displayName: 'Updated Role Name', scopes: [] },
				expectedErrorPath: ['description'],
			},
			{
				name: 'missing scopes',
				request: { displayName: 'Updated Role Name', description: null },
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'empty request body',
				request: {},
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName too short',
				request: { displayName: 'A', description: null, scopes: [] },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'displayName too long',
				request: { displayName: 'A'.repeat(101), description: null, scopes: [] },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'description too long',
				request: { displayName: 'Updated Role Name', description: 'A'.repeat(501), scopes: [] },
				expectedErrorPath: ['description'],
			},
			{
				name: 'invalid scope in array',
				request: {
					displayName: 'Updated Role Name',
					description: null,
					scopes: ['not:a-real-scope'],
				},
				expectedErrorPath: ['scopes', 0],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateRolePublicDto.safeParse(request);

			assert(!result.success, 'Expected validation to fail');

			expect(result.error.issues[0].path).toEqual(expectedErrorPath);
		});
	});
});
