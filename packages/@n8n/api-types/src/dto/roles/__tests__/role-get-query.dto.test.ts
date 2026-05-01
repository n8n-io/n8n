import { RoleGetQueryDto } from '../role-get-query.dto';

describe('RoleGetQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with "true"',
				request: {
					withUsageCount: 'true',
				},
			},
			{
				name: 'with "false"',
				request: {
					withUsageCount: 'false',
				},
			},
			{
				name: 'without withUsageCount (uses default)',
				request: {},
			},
		])('should pass validation for withUsageCount $name', ({ request }) => {
			const result = RoleGetQueryDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'with number',
				request: {
					withUsageCount: 1,
				},
				expectedErrorPath: ['withUsageCount'],
			},
			{
				name: 'with boolean (true)',
				request: {
					withUsageCount: true,
				},
				expectedErrorPath: ['withUsageCount'],
			},
			{
				name: 'with boolean (false)',
				request: {
					withUsageCount: false,
				},
				expectedErrorPath: ['withUsageCount'],
			},
			{
				name: 'with invalid string',
				request: {
					withUsageCount: 'invalid',
				},
				expectedErrorPath: ['withUsageCount'],
			},
		])('should fail validation for withUsageCount $name', ({ request, expectedErrorPath }) => {
			const result = RoleGetQueryDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
