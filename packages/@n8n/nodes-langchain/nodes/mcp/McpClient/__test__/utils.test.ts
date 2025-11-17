import type { JSONSchema7Definition, JSONSchema7 } from 'json-schema';
import { jsonSchemaTypeToDefaultValue, jsonSchemaTypeToFieldType } from '../utils';

describe('jsonSchemaTypeToFieldType', () => {
	it.each([
		[{ schema: { type: 'string', format: 'date-time' } as JSONSchema7, expected: 'dateTime' }],
		[{ schema: { type: 'string' } as JSONSchema7, expected: 'string' }],
		[{ schema: { type: 'number' } as JSONSchema7, expected: 'number' }],
		[{ schema: { type: 'integer' } as JSONSchema7, expected: 'number' }],
		[{ schema: { type: 'boolean' } as JSONSchema7, expected: 'boolean' }],
		[{ schema: { type: 'array' } as JSONSchema7, expected: 'array' }],
		[{ schema: { type: 'object' } as JSONSchema7, expected: 'object' }],
	])('should return the correct field type for the schema', ({ schema, expected }) => {
		expect(jsonSchemaTypeToFieldType(schema)).toEqual(expected);
	});
});

describe('jsonSchemaTypeToDefaultValue', () => {
	it.each([
		[{ schema: false as JSONSchema7Definition, expected: null }],
		[{ schema: true as JSONSchema7Definition, expected: 'any' }],
		[{ schema: { type: 'string' } as JSONSchema7Definition, expected: 'string' }],
		[{ schema: { type: 'number' } as JSONSchema7Definition, expected: 0 }],
		[{ schema: { type: 'integer' } as JSONSchema7Definition, expected: 0 }],
		[{ schema: { type: 'number', minimum: -1 } as JSONSchema7Definition, expected: -1 }],
		[{ schema: { type: 'number', maximum: 1 } as JSONSchema7Definition, expected: 1 }],
		[{ schema: { type: 'boolean' } as JSONSchema7Definition, expected: false }],
		[
			{
				schema: { type: 'string', format: 'date-time' } as JSONSchema7Definition,
				expected: '2025-01-01T00:00:00Z',
			},
		],
		[
			{
				schema: { type: 'string', format: 'uri' } as JSONSchema7Definition,
				expected: 'https://example.com',
			},
		],
		[
			{
				schema: { type: 'string', format: 'url' } as JSONSchema7Definition,
				expected: 'https://example.com',
			},
		],
		[
			{
				schema: { type: 'string', format: 'date' } as JSONSchema7Definition,
				expected: '2025-01-01',
			},
		],
		[{ schema: { type: 'string', format: 'time' } as JSONSchema7Definition, expected: '00:00:00' }],
		[{ schema: { type: 'array' } as JSONSchema7Definition, expected: [] }],
		[
			{
				schema: { type: 'array', items: { type: 'string' } } as JSONSchema7Definition,
				expected: ['string'],
			},
		],
		[
			{
				schema: {
					type: 'array',
					items: [{ type: 'number' }, { type: 'string' }],
				} as JSONSchema7Definition,
				expected: [0, 'string'],
			},
		],
		[
			{
				schema: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						age: { type: 'number' },
					},
					required: ['name', 'age'],
					additionalProperties: false,
				} as JSONSchema7Definition,
				expected: { name: 'string', age: 0 },
			},
		],
		[
			{
				schema: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						age: { type: 'number' },
					},
					required: ['name', 'age'],
					additionalProperties: { type: 'string' },
				} as JSONSchema7Definition,
				expected: { name: 'string', age: 0, '<additionalProperty>': 'string' },
			},
		],
		[
			{
				schema: {
					type: 'string',
					enum: ['foo', 'bar'],
				} as JSONSchema7Definition,
				expected: 'foo',
			},
		],
		[
			{
				schema: {
					oneOf: [{ type: 'string' }, { type: 'number' }],
				} as JSONSchema7Definition,
				expected: 'string',
			},
		],
		[
			{
				schema: {
					anyOf: [{ type: 'string' }, { type: 'number' }],
				} as JSONSchema7Definition,
				expected: 'string',
			},
		],
		[
			{
				schema: {
					allOf: [
						{
							type: 'object',
							properties: {
								age: { type: 'number' },
							},
							required: ['age'],
							additionalProperties: false,
						},
						{
							type: 'object',
							properties: {
								name: { type: 'string' },
							},
							required: ['name'],
							additionalProperties: false,
						},
					],
				} as JSONSchema7Definition,
				expected: { age: 0, name: 'string' },
			},
		],
	])('should return the correct default value for the schema', ({ schema, expected }) => {
		expect(jsonSchemaTypeToDefaultValue(schema)).toEqual(expected);
	});
});
