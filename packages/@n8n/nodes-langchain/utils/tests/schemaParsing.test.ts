import type { JSONSchema7 } from 'json-schema';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError } from 'n8n-workflow';
import type { INode, IExecuteFunctions } from 'n8n-workflow';

import {
	generateSchemaFromExample,
	convertJsonSchemaToZod,
	throwIfToolSchema,
} from './../schemaParsing';

const mockNode: INode = {
	id: '1',
	name: 'Mock node',
	typeVersion: 1,
	type: 'n8n-nodes-base.mock',
	position: [60, 760],
	parameters: {},
};

describe('generateSchemaFromExample', () => {
	it('should generate schema from simple object', () => {
		const example = JSON.stringify({
			name: 'John',
			age: 30,
			active: true,
		});

		const schema = generateSchemaFromExample(example);

		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
				active: { type: 'boolean' },
			},
		});
	});

	it('should generate schema from nested object', () => {
		const example = JSON.stringify({
			user: {
				profile: {
					name: 'Jane',
					email: 'jane@example.com',
				},
				preferences: {
					theme: 'dark',
					notifications: true,
				},
			},
		});

		const schema = generateSchemaFromExample(example);

		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						profile: {
							type: 'object',
							properties: {
								name: { type: 'string' },
								email: { type: 'string' },
							},
						},
						preferences: {
							type: 'object',
							properties: {
								theme: { type: 'string' },
								notifications: { type: 'boolean' },
							},
						},
					},
				},
			},
		});
	});

	it('should generate schema from array', () => {
		const example = JSON.stringify({
			items: ['apple', 'banana', 'cherry'],
			numbers: [1, 2, 3],
		});

		const schema = generateSchemaFromExample(example);

		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				items: {
					type: 'array',
					items: { type: 'string' },
				},
				numbers: {
					type: 'array',
					items: { type: 'number' },
				},
			},
		});
	});

	it('should generate schema from complex nested structure', () => {
		const example = JSON.stringify({
			metadata: {
				version: '1.0.0',
				tags: ['production', 'api'],
			},
			data: [
				{
					id: 1,
					name: 'Item 1',
					properties: {
						color: 'red',
						size: 'large',
					},
				},
			],
		});

		const schema = generateSchemaFromExample(example);

		expect(schema.type).toBe('object');
		expect(schema.properties).toHaveProperty('metadata');
		expect(schema.properties).toHaveProperty('data');
		expect((schema.properties?.data as JSONSchema7).type).toBe('array');
		expect(((schema.properties?.data as JSONSchema7).items as JSONSchema7).type).toBe('object');
	});

	it('should handle null values', () => {
		const example = JSON.stringify({
			name: 'John',
			middleName: null,
			age: 30,
		});

		const schema = generateSchemaFromExample(example);

		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				name: { type: 'string' },
				middleName: { type: 'null' },
				age: { type: 'number' },
			},
		});
	});

	it('should not require fields by default', () => {
		const example = JSON.stringify({
			name: 'John',
			age: 30,
		});

		const schema = generateSchemaFromExample(example);

		expect(schema.required).toBeUndefined();
	});

	it('should make all fields required when allFieldsRequired is true', () => {
		const example = JSON.stringify({
			name: 'John',
			age: 30,
			active: true,
		});

		const schema = generateSchemaFromExample(example, true);

		expect(schema.required).toEqual(['name', 'age', 'active']);
	});

	it('should make all nested fields required when allFieldsRequired is true', () => {
		const example = JSON.stringify({
			user: {
				profile: {
					name: 'Jane',
					email: 'jane@example.com',
				},
				preferences: {
					theme: 'dark',
					notifications: true,
				},
			},
		});

		const schema = generateSchemaFromExample(example, true);

		expect(schema.required).toEqual(['user']);

		const userSchema = schema.properties?.user as JSONSchema7;

		expect(userSchema.required).toEqual(['profile', 'preferences']);
		expect((userSchema.properties?.profile as JSONSchema7).required).toEqual(['name', 'email']);
		expect((userSchema.properties?.preferences as JSONSchema7).required).toEqual([
			'theme',
			'notifications',
		]);

		// Check the full structure
		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						profile: {
							type: 'object',
							properties: {
								name: { type: 'string' },
								email: { type: 'string' },
							},
							required: ['name', 'email'],
						},
						preferences: {
							type: 'object',
							properties: {
								theme: { type: 'string' },
								notifications: { type: 'boolean' },
							},
							required: ['theme', 'notifications'],
						},
					},
					required: ['profile', 'preferences'],
				},
			},
			required: ['user'],
		});
	});

	it('should handle empty object', () => {
		const example = JSON.stringify({});

		const schema = generateSchemaFromExample(example);

		expect(schema).toMatchObject({
			type: 'object',
			properties: {},
		});
	});

	it('should handle empty object with allFieldsRequired true', () => {
		const example = JSON.stringify({});

		const schema = generateSchemaFromExample(example, true);

		expect(schema).toMatchObject({
			type: 'object',
			properties: {},
		});
	});

	it('should throw error for invalid JSON', () => {
		const invalidJson = '{ name: "John", age: 30 }'; // Missing quotes around property names

		expect(() => generateSchemaFromExample(invalidJson)).toThrow();
	});

	it('should handle array of objects', () => {
		const example = JSON.stringify([
			{ id: 1, name: 'Item 1' },
			{ id: 2, name: 'Item 2' },
		]);

		const schema = generateSchemaFromExample(example);

		expect(schema).toMatchObject({
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'number' },
					name: { type: 'string' },
				},
			},
		});
	});

	it('should handle array of objects with allFieldsRequired true', () => {
		const example = JSON.stringify([
			{ id: 1, name: 'Item 1', metadata: { tag: 'prod' } },
			{ id: 2, name: 'Item 2', metadata: { tag: 'dev' } },
		]);

		const schema = generateSchemaFromExample(example, true);

		expect(schema).toMatchObject({
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'number' },
					name: { type: 'string' },
					metadata: {
						type: 'object',
						properties: {
							tag: { type: 'string' },
						},
						required: ['tag'],
					},
				},
				required: ['id', 'name', 'metadata'],
			},
		});
	});
});

describe('convertJsonSchemaToZod', () => {
	it('should convert simple object schema to zod', () => {
		const schema: JSONSchema7 = {
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
			},
			required: ['name'],
		};

		const zodSchema = convertJsonSchemaToZod(schema);

		expect(zodSchema).toBeDefined();
		expect(typeof zodSchema.parse).toBe('function');
	});

	it('should convert and validate with zod schema', () => {
		const schema: JSONSchema7 = {
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
			},
			required: ['name'],
		};

		const zodSchema = convertJsonSchemaToZod(schema);

		// Valid data should pass
		expect(() => zodSchema.parse({ name: 'John', age: 30 })).not.toThrow();
		expect(() => zodSchema.parse({ name: 'John' })).not.toThrow();

		// Invalid data should throw
		expect(() => zodSchema.parse({ age: 30 })).toThrow(); // Missing required name
		expect(() => zodSchema.parse({ name: 'John', age: 'thirty' })).toThrow(); // Wrong type for age
	});
});

describe('throwIfToolSchema', () => {
	it('should throw NodeOperationError for tool schema error', () => {
		const ctx = createMockExecuteFunction<IExecuteFunctions>({}, mockNode);
		const error = new Error('tool input did not match expected schema');

		expect(() => throwIfToolSchema(ctx, error)).toThrow(NodeOperationError);
		expect(() => throwIfToolSchema(ctx, error)).toThrow(/tool input did not match expected schema/);
		expect(() => throwIfToolSchema(ctx, error)).toThrow(
			/This is most likely because some of your tools are configured to require a specific schema/,
		);
	});

	it('should not throw for non-tool schema errors', () => {
		const ctx = createMockExecuteFunction<IExecuteFunctions>({}, mockNode);
		const error = new Error('Some other error');

		expect(() => throwIfToolSchema(ctx, error)).not.toThrow();
	});

	it('should not throw for errors without message', () => {
		const ctx = createMockExecuteFunction<IExecuteFunctions>({}, mockNode);
		const error = new Error();

		expect(() => throwIfToolSchema(ctx, error)).not.toThrow();
	});

	it('should handle errors that are not Error instances', () => {
		const ctx = createMockExecuteFunction<IExecuteFunctions>({}, mockNode);
		const error = { message: 'tool input did not match expected schema' } as Error;

		expect(() => throwIfToolSchema(ctx, error)).toThrow(NodeOperationError);
	});
});
