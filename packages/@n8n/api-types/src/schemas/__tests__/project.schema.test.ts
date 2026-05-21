import {
	projectNameSchema,
	projectTypeSchema,
	projectIconSchema,
	projectDescriptionSchema,
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

	describe('projectDescriptionSchema', () => {
		test.each([
			{ description: 'valid description', value: 'Nice Description', expected: true },
			{ description: 'empty description', value: '', expected: true },
			{ description: 'name too long', value: 'a'.repeat(513), expected: false },
		])('should validate $description', ({ value, expected }) => {
			const result = projectDescriptionSchema.safeParse(value);
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
				value: { userId: 'user-123', role: 'project:personalOwner' },
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
