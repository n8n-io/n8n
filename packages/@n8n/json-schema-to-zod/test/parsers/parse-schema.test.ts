import { z } from 'zod';

import { parseSchema } from '../../src/parsers/parse-schema';

describe('parseSchema', () => {
	test('should be usable without providing refs', () => {
		expect(parseSchema({ type: 'string' })).toMatchZod(z.string());
	});

	test('should return a seen and processed ref', () => {
		const seen = new Map();
		const schema = {
			type: 'object',
			properties: {
				prop: {
					type: 'string',
				},
			},
		};
		expect(parseSchema(schema, { seen, path: [] }));
		expect(parseSchema(schema, { seen, path: [] }));
	});

	test('should be possible to describe a readonly schema', () => {
		expect(parseSchema({ type: 'string', readOnly: true })).toMatchZod(z.string().readonly());
	});

	test('should handle nullable', () => {
		expect(
			parseSchema(
				{
					type: 'string',
					nullable: true,
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.string().nullable());
	});

	test('should handle enum', () => {
		expect(parseSchema({ enum: ['someValue', 57] })).toMatchZod(
			z.union([z.literal('someValue'), z.literal(57)]),
		);
	});

	test('should handle multiple type', () => {
		expect(parseSchema({ type: ['string', 'number'] })).toMatchZod(
			z.union([z.string(), z.number()]),
		);
	});

	test('should handle if-then-else type', () => {
		expect(
			parseSchema({
				if: { type: 'string' },
				then: { type: 'number' },
				else: { type: 'boolean' },
			}),
		).toMatchZod(
			z.union([z.number(), z.boolean()]).superRefine((value, ctx) => {
				const result = z.string().safeParse(value).success
					? z.number().safeParse(value)
					: z.boolean().safeParse(value);
				if (!result.success) {
					result.error.errors.forEach((error) => ctx.addIssue(error));
				}
			}),
		);
	});

	test('should handle anyOf', () => {
		expect(
			parseSchema({
				anyOf: [
					{
						type: 'string',
					},
					{ type: 'number' },
				],
			}),
		).toMatchZod(z.union([z.string(), z.number()]));
	});

	test('should handle oneOf', () => {
		expect(
			parseSchema({
				oneOf: [
					{
						type: 'string',
					},
					{ type: 'number' },
				],
			}),
		).toMatchZod(
			z.any().superRefine((x, ctx) => {
				const schemas = [z.string(), z.number()];
				const errors = schemas.reduce<z.ZodError[]>(
					(errors, schema) =>
						((result) => (result.error ? [...errors, result.error] : errors))(schema.safeParse(x)),
					[],
				);
				if (schemas.length - errors.length !== 1) {
					ctx.addIssue({
						path: ctx.path,
						code: 'invalid_union',
						unionErrors: errors,
						message: 'Invalid input: Should pass single schema',
					});
				}
			}),
		);
	});
});
