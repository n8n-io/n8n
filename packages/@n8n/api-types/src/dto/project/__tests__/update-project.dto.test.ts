import { UpdateProjectDto } from '../update-project.dto';

describe('UpdateProjectDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'just the name',
				request: {
					name: 'My Updated Project',
				},
			},
			{
				name: 'name and emoji icon',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'emoji',
						value: '🚀',
					},
				},
			},
			{
				name: 'name and regular icon',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'icon',
						value: 'blah',
					},
				},
			},
			{
				name: 'just the description',
				request: {
					description: 'My Updated Project Description',
				},
			},
			{
				name: 'an empty description',
				request: {
					description: '',
				},
			},
			{
				name: 'just the relations',
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
				name: 'all fields',
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
					description: 'My Updated Project Description',
				},
			},
		])('should pass validation for $name', ({ request }) => {
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
				name: 'empty name',
				request: { name: '', icon: { type: 'emoji', value: '🚀' } },
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
							role: 'project:personalOwner',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'role'],
			},
			{
				name: 'invalid description type',
				request: { description: 123 },
				expectedErrorPath: ['description'],
			},
			{
				name: 'description too long',
				request: { description: 'a'.repeat(513) },
				expectedErrorPath: ['description'],
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
