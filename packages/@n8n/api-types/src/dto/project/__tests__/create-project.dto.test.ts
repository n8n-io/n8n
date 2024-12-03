import { CreateProjectDto } from '../create-project.dto';

describe('CreateProjectDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with just the name',
				request: {
					name: 'My Awesome Project',
				},
			},
			{
				name: 'with name and emoji icon',
				request: {
					name: 'My Awesome Project',
					settings: {
						icon: {
							type: 'emoji',
							value: '🚀',
						},
					},
				},
			},
			{
				name: 'with name and regular icon',
				request: {
					name: 'My Awesome Project',
					settings: {
						icon: {
							type: 'icon',
							value: 'blah',
						},
					},
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CreateProjectDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing name',
				request: { settings: { icon: { type: 'emoji', value: '🚀' } } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty name',
				request: { name: '', settings: { icon: { type: 'emoji', value: '🚀' } } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: { name: 'a'.repeat(256), settings: { icon: { type: 'emoji', value: '🚀' } } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'invalid icon type',
				request: {
					name: 'My Awesome Project',
					settings: { icon: { type: 'invalid', value: '🚀' } },
				},
				expectedErrorPath: ['settings', 'icon', 'type'],
			},
			{
				name: 'invalid icon value',
				request: { name: 'My Awesome Project', settings: { icon: { type: 'emoji', value: '' } } },
				expectedErrorPath: ['settings', 'icon', 'value'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = CreateProjectDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
