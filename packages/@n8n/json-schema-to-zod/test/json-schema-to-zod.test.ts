import type { JSONSchema4, JSONSchema6Definition, JSONSchema7Definition } from 'json-schema';
import { z } from 'zod';

import { jsonSchemaToZod } from '../src';

describe('jsonSchemaToZod', () => {
	test('should accept json schema 7 and 4', () => {
		const schema = { type: 'string' } as unknown;

		expect(jsonSchemaToZod(schema as JSONSchema4));
		expect(jsonSchemaToZod(schema as JSONSchema6Definition));
		expect(jsonSchemaToZod(schema as JSONSchema7Definition));
	});

	test('can exclude defaults', () => {
		expect(
			jsonSchemaToZod(
				{
					type: 'string',
					default: 'foo',
				},
				{ withoutDefaults: true },
			),
		).toMatchZod(z.string());
	});

	test('should include describes', () => {
		expect(
			jsonSchemaToZod({
				type: 'string',
				description: 'foo',
			}),
		).toMatchZod(z.string().describe('foo'));
	});

	test('can exclude describes', () => {
		expect(
			jsonSchemaToZod(
				{
					type: 'string',
					description: 'foo',
				},
				{
					withoutDescribes: true,
				},
			),
		).toMatchZod(z.string());
	});

	test('will remove optionality if default is present', () => {
		expect(
			jsonSchemaToZod({
				type: 'object',
				properties: {
					prop: {
						type: 'string',
						default: 'def',
					},
				},
			}),
		).toMatchZod(z.object({ prop: z.string().default('def') }));
	});

	test('will handle falsy defaults', () => {
		expect(
			jsonSchemaToZod({
				type: 'boolean',
				default: false,
			}),
		).toMatchZod(z.boolean().default(false));
	});

	test('will ignore undefined as default', () => {
		expect(
			jsonSchemaToZod({
				type: 'null',
				default: undefined,
			}),
		).toMatchZod(z.null());
	});

	test('should be possible to define a custom parser', () => {
		expect(
			jsonSchemaToZod(
				{
					allOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean', description: 'foo' }],
				},
				{
					parserOverride: (schema, refs) => {
						if (
							refs.path.length === 2 &&
							refs.path[0] === 'allOf' &&
							refs.path[1] === 2 &&
							schema.type === 'boolean' &&
							schema.description === 'foo'
						) {
							return z.null();
						}

						return undefined;
					},
				},
			),
		).toMatchZod(z.intersection(z.string(), z.intersection(z.number(), z.null())));
	});
});
