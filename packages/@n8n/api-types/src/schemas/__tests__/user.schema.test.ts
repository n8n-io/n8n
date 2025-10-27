import { roleSchema, userDetailSchema, userBaseSchema, usersListSchema } from '../user.schema';

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

	describe('userDetailSchema', () => {
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
				name: 'user with undefined fields',
				data: {
					id: '123',
					role: 'global:member',
					isPending: false,
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
			const result = userDetailSchema.safeParse(data);
			expect(result.success).toBe(isValid);
		});
	});

	describe('userBaseSchema', () => {
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
				name: 'user with undefined fields',
				data: {
					id: '123',
					role: 'global:member',
					isPending: false,
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
			const result = userBaseSchema.safeParse(data);
			expect(result.success).toBe(isValid);
		});
	});

	describe('usersListSchema', () => {
		test.each([
			{
				name: 'valid users list',
				data: {
					count: 2,
					items: [
						{
							id: '123',
							firstName: 'John',
							lastName: 'Doe',
							email: 'johndoe@example.com',
							role: 'global:member',
							isPending: false,
							projects: ['project1', 'project2'],
						},
						{
							id: '456',
							firstName: 'Jane',
							lastName: 'Doe',
							email: 'janedoe@example.com',
							role: 'global:admin',
							isPending: true,
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
					items: [],
				},
				isValid: true,
			},
			{
				name: 'missing count',
				data: {
					items: [],
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
					items: [
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
