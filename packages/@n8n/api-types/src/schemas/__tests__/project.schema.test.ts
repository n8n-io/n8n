import {
	projectNameSchema,
	projectTypeSchema,
	projectIconSchema,
	projectRoleSchema,
	projectRelationSchema,
} from '../project.schema';

describe('project.schema', () => {
	describe('projectNameSchema', () => {
		test.each([
			{ name: 'valid name', value: 'My Project', expected: true },
			{ name: 'empty name', value: '', expected: false },
			{ name: 'name too long', value: 'a'.repeat(256), expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = projectNameSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('projectTypeSchema', () => {
		test.each([
			{ name: 'valid type: personal', value: 'personal', expected: true },
			{ name: 'valid type: team', value: 'team', expected: true },
			{ name: 'invalid type', value: 'invalid', expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = projectTypeSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('projectIconSchema', () => {
		test.each([
			{
				name: 'valid emoji icon',
				value: { type: 'emoji', value: '🚀' },
				expected: true,
			},
			{
				name: 'valid icon',
				value: { type: 'icon', value: 'blah' },
				expected: true,
			},
			{
				name: 'invalid icon type',
				value: { type: 'invalid', value: '🚀' },
				expected: false,
			},
			{
				name: 'empty icon value',
				value: { type: 'emoji', value: '' },
				expected: false,
			},
		])('should validate $name', ({ value, expected }) => {
			const result = projectIconSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('projectRoleSchema', () => {
		test.each([
			{ name: 'valid role: project:personalOwner', value: 'project:personalOwner', expected: true },
			{ name: 'valid role: project:admin', value: 'project:admin', expected: true },
			{ name: 'valid role: project:editor', value: 'project:editor', expected: true },
			{ name: 'valid role: project:viewer', value: 'project:viewer', expected: true },
			{ name: 'invalid role', value: 'invalid-role', expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = projectRoleSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('projectRelationSchema', () => {
		test.each([
			{
				name: 'valid relation',
				value: { userId: 'user-123', role: 'project:admin' },
				expected: true,
			},
			{
				name: 'invalid userId type',
				value: { userId: 123, role: 'project:admin' },
				expected: false,
			},
			{
				name: 'invalid role',
				value: { userId: 'user-123', role: 'invalid-role' },
				expected: false,
			},
			{
				name: 'missing userId',
				value: { role: 'project:admin' },
				expected: false,
			},
			{
				name: 'missing role',
				value: { userId: 'user-123' },
				expected: false,
			},
		])('should validate $name', ({ value, expected }) => {
			const result = projectRelationSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});
});
