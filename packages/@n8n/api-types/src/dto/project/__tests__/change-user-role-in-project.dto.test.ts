import { ChangeUserRoleInProject } from '../change-user-role-in-project.dto';

describe('ChangeUserRoleInProject', () => {
	describe('Allow valid roles', () => {
		test.each(['project:admin', 'project:editor', 'project:viewer'])('should allow %s', (role) => {
			const result = ChangeUserRoleInProject.safeParse({ role });
			expect(result.success).toBe(true);
		});
	});

	describe('Reject invalid roles', () => {
		test.each([
			{
				name: 'missing role',
				request: {},
				expectedErrorPath: ['role'],
			},
			{
				name: 'empty role',
				request: {
					role: '',
				},
				expectedErrorPath: ['role'],
			},
			{
				name: 'invalid role type',
				request: {
					role: 123,
				},
				expectedErrorPath: ['role'],
			},
			{
				name: 'invalid role value',
				request: {
					role: 'invalid-role',
				},
				expectedErrorPath: ['role'],
			},
			{
				name: 'personal owner role',
				request: { role: 'project:personalOwner' },
				expectedErrorPath: ['role'],
			},
		])('should reject $name', ({ request, expectedErrorPath }) => {
			const result = ChangeUserRoleInProject.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
