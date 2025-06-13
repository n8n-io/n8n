import { roleSchema, userListItemSchema, usersListSchema } from '../user.schema';

describe('user.schema', () => {
	describe('roleSchema', () => {
		test.each([
			['global:owner', true],
			['global:member', true],
			['global:admin', true],
			['default', true],
			['invalid-role', false],
		])('should validate role %s', (value, expected) => {
			const result = roleSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('userListItemSchema', () => {
		test.each([
			{
				name: 'valid user',
				data: {
					id: '123',
					firstName: 'John',
					lastName: 'Doe',
					email: 'johndoe@example.com',
					role: 'global:member',
					isPending: false,
					lastActive: '2023-10-01T12:00:00Z',
					projects: ['project1', 'project2'],
				},
				isValid: true,
			},
			{
				name: 'user with null fields',
				data: {
					id: '123',
					firstName: null,
					lastName: null,
					email: null,
					role: 'global:member',
					isPending: false,
					lastActive: null,
					projects: null,
				},
				isValid: true,
			},
			{
				name: 'invalid email',
				data: {
					id: '123',
					firstName: 'John',
					lastName: 'Doe',
					email: 'not-an-email',
					role: 'global:member',
					isPending: false,
					lastActive: '2023-10-01T12:00:00Z',
					projects: ['project1', 'project2'],
				},
				isValid: false,
			},
			{
				name: 'missing required fields',
				data: {
					firstName: 'John',
					lastName: 'Doe',
					email: null,
					role: 'global:member',
					isPending: false,
					lastActive: '2023-10-01T12:00:00Z',
				},
				isValid: false,
			},
			{
				name: 'invalid role',
				data: {
					id: '123',
					firstName: 'John',
					lastName: 'Doe',
					email: 'johndoe@example.com',
					role: 'invalid-role',
					isPending: false,
					lastActive: '2023-10-01T12:00:00Z',
					projects: ['project1', 'project2'],
				},
				isValid: false,
			},
		])('should validate $name', ({ data, isValid }) => {
			const result = userListItemSchema.safeParse(data);
			expect(result.success).toBe(isValid);
		});
	});

	describe('usersListSchema', () => {
		test.each([
			{
				name: 'valid users list',
				data: {
					count: 2,
					data: [
						{
							id: '123',
							firstName: 'John',
							lastName: 'Doe',
							email: 'johndoe@example.com',
							role: 'global:member',
							isPending: false,
							lastActive: '2023-10-01T12:00:00Z',
							projects: ['project1', 'project2'],
						},
						{
							id: '456',
							firstName: 'Jane',
							lastName: 'Doe',
							email: 'janedoe@example.com',
							role: 'global:admin',
							isPending: true,
							lastActive: '2023-10-02T12:00:00Z',
							projects: null,
						},
					],
				},
				isValid: true,
			},
			{
				name: 'empty users list',
				data: {
					count: 0,
					data: [],
				},
				isValid: true,
			},
			{
				name: 'missing count',
				data: {
					data: [],
				},
				isValid: false,
			},
			{
				name: 'missing data',
				data: {
					count: 5,
				},
				isValid: false,
			},
			{
				name: 'invalid user in list',
				data: {
					count: 1,
					data: [
						{
							id: '123',
							firstName: 'John',
							lastName: 'Doe',
							email: 'email',
							role: 'global:member',
							isPending: false,
							lastActive: '2023-10-01T12:00:00Z',
							projects: ['project1', 'project2'],
						},
					],
				},
				isValid: false,
			},
		])('should validate $name', ({ data, isValid }) => {
			const result = usersListSchema.safeParse(data);
			expect(result.success).toBe(isValid);
		});
	});
});
