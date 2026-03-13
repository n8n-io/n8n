import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';

import { zodCallToJsonSchema } from '../zod-to-json-schema';

function parseZodExpression(code: string) {
	const project = new Project({ useInMemoryFileSystem: true });
	const file = project.createSourceFile('test.ts', `const schema = ${code};`);
	const decl = file.getVariableDeclarationOrThrow('schema');
	return decl.getInitializerOrThrow();
}

describe('zodCallToJsonSchema', () => {
	it('converts z.string()', () => {
		const node = parseZodExpression('z.string()');
		expect(zodCallToJsonSchema(node)).toEqual({ type: 'string' });
	});

	it('converts z.number()', () => {
		const node = parseZodExpression('z.number()');
		expect(zodCallToJsonSchema(node)).toEqual({ type: 'number' });
	});

	it('converts z.boolean()', () => {
		const node = parseZodExpression('z.boolean()');
		expect(zodCallToJsonSchema(node)).toEqual({ type: 'boolean' });
	});

	it('converts z.string().optional()', () => {
		const node = parseZodExpression('z.string().optional()');
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({ type: 'string', optional: true });
	});

	it('converts z.number().min(1).max(10)', () => {
		const node = parseZodExpression('z.number().min(1).max(10)');
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({ type: 'number', minimum: 1, maximum: 10 });
	});

	it('converts z.string().min(3).max(50)', () => {
		const node = parseZodExpression('z.string().min(3).max(50)');
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({ type: 'string', minLength: 3, maxLength: 50 });
	});

	it('converts z.enum(["a", "b", "c"])', () => {
		const node = parseZodExpression('z.enum(["a", "b", "c"])');
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({ type: 'string', enum: ['a', 'b', 'c'] });
	});

	it('converts z.array(z.string())', () => {
		const node = parseZodExpression('z.array(z.string())');
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({ type: 'array', items: { type: 'string' } });
	});

	it('converts z.object with required and optional fields', () => {
		const node = parseZodExpression(`z.object({
			name: z.string(),
			age: z.number().optional(),
			active: z.boolean(),
		})`);
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
				active: { type: 'boolean' },
			},
			required: ['name', 'active'],
		});
	});

	it('converts z.string().default("hello")', () => {
		const node = parseZodExpression('z.string().default("hello")');
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({ type: 'string', default: 'hello' });
	});

	it('converts nested z.object', () => {
		const node = parseZodExpression(`z.object({
			user: z.object({
				name: z.string(),
				email: z.string(),
			}),
		})`);
		const result = zodCallToJsonSchema(node);
		expect(result).toEqual({
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						email: { type: 'string' },
					},
					required: ['name', 'email'],
				},
			},
			required: ['user'],
		});
	});

	it('returns null for unsupported expressions', () => {
		const node = parseZodExpression('someOtherFunction()');
		expect(zodCallToJsonSchema(node)).toBeNull();
	});
});
