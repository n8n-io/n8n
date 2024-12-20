import { z } from 'zod';

import { parseOneOf } from '../../src/parsers/parse-one-of';

describe('parseOneOf', () => {
	test('should create a union from two or more schemas', () => {
		expect(
			parseOneOf(
				{
					oneOf: [
						{
							type: 'string',
						},
						{ type: 'number' },
					],
				},
				{ path: [], seen: new Map() },
			),
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

	test('should extract a single schema', () => {
		expect(parseOneOf({ oneOf: [{ type: 'string' }] }, { path: [], seen: new Map() })).toMatchZod(
			z.string(),
		);
	});

	test('should return z.any() if array is empty', () => {
		expect(parseOneOf({ oneOf: [] }, { path: [], seen: new Map() })).toMatchZod(z.any());
	});
});
