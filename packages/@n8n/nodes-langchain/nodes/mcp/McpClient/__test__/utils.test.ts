import type { JSONSchema7Definition, JSONSchema7 } from 'json-schema';

import {
	convertJsonSchemaToResourceMapperFields,
	jsonSchemaTypeToDefaultValue,
	jsonSchemaTypeToFieldType,
} from '../utils';

describe('utils', () => {
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
			[
				{
					schema: { type: 'string', format: 'time' } as JSONSchema7Definition,
					expected: '00:00:00',
				},
			],
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

	describe('convertJsonSchemaToResourceMapperFields', () => {
		it.each([
			[
				{
					schema: { type: 'string' } as JSONSchema7,
					expected: [],
				},
			],
			[
				{
					schema: { type: 'object' } as JSONSchema7,
					expected: [],
				},
			],
			[
				{
					schema: {
						type: 'object',
						properties: { name: { type: 'string' }, age: { type: 'number' } },
						required: ['name'],
					} as JSONSchema7,
					expected: [
						{
							id: 'name',
							displayName: 'name',
							defaultMatch: false,
							required: true,
							display: true,
							type: 'string',
						},
						{
							id: 'age',
							displayName: 'age',
							defaultMatch: false,
							required: false,
							display: true,
							type: 'number',
						},
					],
				},
			],
			[
				{
					schema: { type: 'object', properties: { name: true, age: false } } as JSONSchema7,
					expected: [
						{
							id: 'name',
							displayName: 'name',
							defaultMatch: false,
							required: false,
							display: true,
							type: 'string',
						},
					],
				},
			],
		])(
			'should return the correct resource mapper fields for the schema',
			({ schema, expected }) => {
				expect(convertJsonSchemaToResourceMapperFields(schema)).toEqual(expected);
			},
		);

		it.each([
			[
				{
					schema: {
						type: 'object',
						properties: { names: { type: 'array', items: { type: 'string' } } },
						required: ['names'],
					} as JSONSchema7,
					expected: [
						{
							id: 'names',
							displayName: 'names',
							defaultMatch: false,
							required: true,
							display: true,
							type: 'array',
							defaultValue: JSON.stringify(['string'], null, 2),
						},
					],
				},
			],
			[
				{
					schema: {
						type: 'object',
						properties: {
							user: {
								type: 'object',
								properties: { name: { type: 'string' }, age: { type: 'number' } },
							},
						},
						required: ['user'],
					} as JSONSchema7,
					expected: [
						{
							id: 'user',
							displayName: 'user',
							defaultMatch: false,
							required: true,
							display: true,
							type: 'object',
							defaultValue: JSON.stringify({ name: 'string', age: 0 }, null, 2),
						},
					],
				},
			],
		])('should add defaultValue for arrays and objects', ({ schema, expected }) => {
			expect(convertJsonSchemaToResourceMapperFields(schema)).toEqual(expected);
		});

		it('should add options for enums', () => {
			const schema = {
				type: 'object',
				properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } },
			} as JSONSchema7;
			const expected = [
				{
					id: 'color',
					displayName: 'color',
					defaultMatch: false,
					required: false,
					display: true,
					type: 'options',
					options: [
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'red', value: 'red' },
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'green', value: 'green' },
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'blue', value: 'blue' },
					],
				},
			];
			expect(convertJsonSchemaToResourceMapperFields(schema)).toEqual(expected);
		});

		it.each([
			[{ type: 'integer' }, 'number'],
			[{ anyOf: [{ type: 'integer' }, { type: 'null' }] }, 'number'],
			[{ oneOf: [{ type: 'null' }, { type: 'number' }] }, 'number'],
			[{ type: ['boolean', 'null'] }, 'boolean'],
			[{ type: ['null', 'string'], format: 'date-time' }, 'dateTime'],
			[{ anyOf: [{ type: 'string' }, { type: 'number' }] }, 'string'],
			[{ type: ['string', 'number', 'null'] }, 'string'],
		] as Array<[JSONSchema7, string]>)(
			'should keep the type of a nullable parameter (%j)',
			(propertySchema, expectedType) => {
				const schema: JSONSchema7 = { type: 'object', properties: { value: propertySchema } };
				expect(convertJsonSchemaToResourceMapperFields(schema)[0].type).toEqual(expectedType);
			},
		);

		it('should keep the options and title of a nullable enum', () => {
			const schema = {
				type: 'object',
				properties: {
					sort: {
						title: 'Sort order',
						anyOf: [{ type: 'string', enum: ['newest', 'oldest'] }, { type: 'null' }],
						default: null,
					},
				},
			} as JSONSchema7;

			const [field] = convertJsonSchemaToResourceMapperFields(schema);

			expect(field.displayName).toEqual('Sort order');
			expect(field.type).toEqual('options');
			expect(field.options).toEqual([
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'newest', value: 'newest' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'oldest', value: 'oldest' },
			]);
		});

		it('should add defaultValue for a nullable array', () => {
			const schema = {
				type: 'object',
				properties: {
					tags: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
				},
			} as JSONSchema7;

			const [field] = convertJsonSchemaToResourceMapperFields(schema);

			expect(field.type).toEqual('array');
			expect(field.defaultValue).toEqual(JSON.stringify(['string'], null, 2));
		});
	});
});
