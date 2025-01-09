import { UpdateProjectDto } from '../update-project.dto';

describe('UpdateProjectDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with just the name',
				request: {
					name: 'My Updated Project',
				},
			},
			{
				name: 'with name and emoji icon',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'emoji',
						value: '🚀',
					},
				},
			},
			{
				name: 'with name and regular icon',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'icon',
						value: 'blah',
					},
				},
			},
			{
				name: 'with relations',
				request: {
					relations: [
						{
							userId: 'user-123',
							role: 'project:admin',
						},
					],
				},
			},
			{
				name: 'with all fields',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'emoji',
						value: '🚀',
					},
					relations: [
						{
							userId: 'user-123',
							role: 'project:admin',
						},
					],
				},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateProjectDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid name type',
				request: { name: 123 },
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: { name: 'a'.repeat(256) },
				expectedErrorPath: ['name'],
			},
			{
				name: 'invalid icon type',
				request: { icon: { type: 'invalid', value: '🚀' } },
				expectedErrorPath: ['icon', 'type'],
			},
			{
				name: 'invalid icon value',
				request: { icon: { type: 'emoji', value: '' } },
				expectedErrorPath: ['icon', 'value'],
			},
			{
				name: 'invalid relations userId',
				request: {
					relations: [
						{
							userId: 123,
							role: 'project:admin',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'userId'],
			},
			{
				name: 'invalid relations role',
				request: {
					relations: [
						{
							userId: 'user-123',
							role: 'invalid-role',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'role'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateProjectDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
