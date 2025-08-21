import { AddUsersToProjectDto } from '../add-users-to-project.dto';

describe('AddUsersToProjectDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with single user',
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
				name: 'with multiple relations',
				request: {
					relations: [
						{
							userId: 'user-123',
							role: 'project:admin',
						},
						{
							userId: 'user-456',
							role: 'project:editor',
						},
						{
							userId: 'user-789',
							role: 'project:viewer',
						},
					],
				},
			},
			{
				name: 'with all possible roles unless the `project:personalOwner`',
				request: {
					relations: [
						{ userId: 'user-1', role: 'project:admin' },
						{ userId: 'user-2', role: 'project:editor' },
						{ userId: 'user-3', role: 'project:viewer' },
					],
				},
			},
		])('should validate $name', ({ request }) => {
			const result = AddUsersToProjectDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing relations array',
				request: {},
				expectedErrorPath: ['relations'],
			},
			{
				name: 'empty relations array',
				request: {
					relations: [],
				},
				expectedErrorPath: ['relations'],
			},
			{
				name: 'invalid userId type',
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
				name: 'empty userId',
				request: {
					relations: [
						{
							userId: '',
							role: 'project:admin',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'userId'],
			},
			{
				name: 'invalid role',
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
			{
				name: 'missing role',
				request: {
					relations: [
						{
							userId: 'user-123',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'role'],
			},
			{
				name: 'invalid relations array type',
				request: {
					relations: 'not-an-array',
				},
				expectedErrorPath: ['relations'],
			},
			{
				name: 'invalid user object in array',
				request: {
					relations: ['not-an-object'],
				},
				expectedErrorPath: ['relations', 0],
			},
			{
				name: 'invalid with `project:personalOwner` role',
				request: {
					relations: [{ userId: 'user-1', role: 'project:personalOwner' }],
				},
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = AddUsersToProjectDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
