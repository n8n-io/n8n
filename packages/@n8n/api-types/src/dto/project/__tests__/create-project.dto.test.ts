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
					icon: {
						type: 'emoji',
						value: '🚀',
					},
				},
			},
			{
				name: 'with name and regular icon',
				request: {
					name: 'My Awesome Project',
					icon: {
						type: 'icon',
						value: 'blah',
					},
				},
			},
			{
				name: 'with name and description',
				request: {
					name: 'My Awesome Project',
					description: 'A project description',
				},
			},
			{
				name: 'with name and empty description',
				request: {
					name: 'My Awesome Project',
					description: '',
				},
			},
			{
				name: 'with all fields',
				request: {
					name: 'My Awesome Project',
					icon: {
						type: 'emoji',
						value: '🚀',
					},
					description: 'A project description',
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
				request: { icon: { type: 'emoji', value: '🚀' } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty name',
				request: { name: '', icon: { type: 'emoji', value: '🚀' } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: { name: 'a'.repeat(256), icon: { type: 'emoji', value: '🚀' } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'invalid icon type',
				request: { name: 'My Awesome Project', icon: { type: 'invalid', value: '🚀' } },
				expectedErrorPath: ['icon', 'type'],
			},
			{
				name: 'invalid icon value',
				request: { name: 'My Awesome Project', icon: { type: 'emoji', value: '' } },
				expectedErrorPath: ['icon', 'value'],
			},
			{
				name: 'icon missing type',
				request: { name: 'My Awesome Project', icon: { value: '🚀' } },
				expectedErrorPath: ['icon', 'type'],
			},
			{
				name: 'icon missing value',
				request: { name: 'My Awesome Project', icon: { type: 'emoji' } },
				expectedErrorPath: ['icon', 'value'],
			},
			{
				name: 'icon as string instead of object',
				request: { name: 'My Awesome Project', icon: '🚀' },
				expectedErrorPath: ['icon'],
			},
			{
				name: 'description too long',
				request: { name: 'My Awesome Project', description: 'a'.repeat(513) },
				expectedErrorPath: ['description'],
			},
			{
				name: 'invalid description type',
				request: { name: 'My Awesome Project', description: 123 },
				expectedErrorPath: ['description'],
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
