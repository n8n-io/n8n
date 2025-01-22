/* eslint-disable n8n-local-rules/no-skipped-tests */
import type { JSONSchema7 } from 'json-schema';
import { z, ZodError } from 'zod';

import { parseObject } from '../../src/parsers/parse-object';

describe('parseObject', () => {
	test('should handle with missing properties', () => {
		expect(
			parseObject(
				{
					type: 'object',
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.record(z.any()));
	});

	test('should handle with empty properties', () => {
		expect(
			parseObject(
				{
					type: 'object',
					properties: {},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.object({}));
	});

	test('With properties - should handle optional and required properties', () => {
		expect(
			parseObject(
				{
					type: 'object',
					required: ['myRequiredString'],
					properties: {
						myOptionalString: {
							type: 'string',
						},
						myRequiredString: {
							type: 'string',
						},
					},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z.object({ myOptionalString: z.string().optional(), myRequiredString: z.string() }),
		);
	});

	test('With properties - should handle additionalProperties when set to false', () => {
		expect(
			parseObject(
				{
					type: 'object',
					required: ['myString'],
					properties: {
						myString: {
							type: 'string',
						},
					},
					additionalProperties: false,
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.object({ myString: z.string() }).strict());
	});

	test('With properties - should handle additionalProperties when set to true', () => {
		expect(
			parseObject(
				{
					type: 'object',
					required: ['myString'],
					properties: {
						myString: {
							type: 'string',
						},
					},
					additionalProperties: true,
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.object({ myString: z.string() }).catchall(z.any()));
	});

	test('With properties - should handle additionalProperties when provided a schema', () => {
		expect(
			parseObject(
				{
					type: 'object',
					required: ['myString'],
					properties: {
						myString: {
							type: 'string',
						},
					},
					additionalProperties: { type: 'number' },
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.object({ myString: z.string() }).catchall(z.number()));
	});

	test('Without properties - should handle additionalProperties when set to false', () => {
		expect(
			parseObject(
				{
					type: 'object',
					additionalProperties: false,
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.record(z.never()));
	});

	test('Without properties - should handle additionalProperties when set to true', () => {
		expect(
			parseObject(
				{
					type: 'object',
					additionalProperties: true,
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.record(z.any()));
	});

	test('Without properties - should handle additionalProperties when provided a schema', () => {
		expect(
			parseObject(
				{
					type: 'object',
					additionalProperties: { type: 'number' },
				},

				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.record(z.number()));
	});

	test('Without properties - should include falsy defaults', () => {
		expect(
			parseObject(
				{
					type: 'object',
					properties: {
						s: {
							type: 'string',
							default: '',
						},
					},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.object({ s: z.string().default('') }));
	});

	test('eh', () => {
		expect(
			parseObject(
				{
					type: 'object',
					required: ['a'],
					properties: {
						a: {
							type: 'string',
						},
					},
					anyOf: [
						{
							required: ['b'],
							properties: {
								b: {
									type: 'string',
								},
							},
						},
						{
							required: ['c'],
							properties: {
								c: {
									type: 'string',
								},
							},
						},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z
				.object({ a: z.string() })
				.and(z.union([z.object({ b: z.string() }), z.object({ c: z.string() })])),
		);

		expect(
			parseObject(
				{
					type: 'object',
					required: ['a'],
					properties: {
						a: {
							type: 'string',
						},
					},
					anyOf: [
						{
							required: ['b'],
							properties: {
								b: {
									type: 'string',
								},
							},
						},
						{},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.object({ a: z.string() }).and(z.union([z.object({ b: z.string() }), z.any()])));

		expect(
			parseObject(
				{
					type: 'object',
					required: ['a'],
					properties: {
						a: {
							type: 'string',
						},
					},
					oneOf: [
						{
							required: ['b'],
							properties: {
								b: {
									type: 'string',
								},
							},
						},
						{
							required: ['c'],
							properties: {
								c: {
									type: 'string',
								},
							},
						},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z.object({ a: z.string() }).and(
				z.any().superRefine((x, ctx) => {
					const schemas = [z.object({ b: z.string() }), z.object({ c: z.string() })];
					const errors = schemas.reduce<z.ZodError[]>(
						(errors, schema) =>
							((result) => (result.error ? [...errors, result.error] : errors))(
								schema.safeParse(x),
							),
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
			),
		);

		expect(
			parseObject(
				{
					type: 'object',
					required: ['a'],
					properties: {
						a: {
							type: 'string',
						},
					},
					oneOf: [
						{
							required: ['b'],
							properties: {
								b: {
									type: 'string',
								},
							},
						},
						{},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z.object({ a: z.string() }).and(
				z.any().superRefine((x, ctx) => {
					const schemas = [z.object({ b: z.string() }), z.any()];
					const errors = schemas.reduce<z.ZodError[]>(
						(errors, schema) =>
							((result) => (result.error ? [...errors, result.error] : errors))(
								schema.safeParse(x),
							),
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
			),
		);

		expect(
			parseObject(
				{
					type: 'object',
					required: ['a'],
					properties: {
						a: {
							type: 'string',
						},
					},
					allOf: [
						{
							required: ['b'],
							properties: {
								b: {
									type: 'string',
								},
							},
						},
						{
							required: ['c'],
							properties: {
								c: {
									type: 'string',
								},
							},
						},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z
				.object({ a: z.string() })
				.and(z.intersection(z.object({ b: z.string() }), z.object({ c: z.string() }))),
		);

		expect(
			parseObject(
				{
					type: 'object',
					required: ['a'],
					properties: {
						a: {
							type: 'string',
						},
					},
					allOf: [
						{
							required: ['b'],
							properties: {
								b: {
									type: 'string',
								},
							},
						},
						{},
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z.object({ a: z.string() }).and(z.intersection(z.object({ b: z.string() }), z.any())),
		);
	});

	const run = (zodSchema: z.ZodTypeAny, data: unknown) => zodSchema.safeParse(data);

	test('Functional tests - run', () => {
		expect(run(z.string(), 'hello')).toEqual({
			success: true,
			data: 'hello',
		});
	});

	test('Functional tests - properties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			required: ['a'],
			properties: {
				a: {
					type: 'string',
				},
				b: {
					type: 'number',
				},
			},
		};

		const expected = z.object({ a: z.string(), b: z.number().optional() });
		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);

		expect(run(result, { a: 'hello' })).toEqual({
			success: true,
			data: {
				a: 'hello',
			},
		});

		expect(run(result, { a: 'hello', b: 123 })).toEqual({
			success: true,
			data: {
				a: 'hello',
				b: 123,
			},
		});

		expect(run(result, { b: 'hello', x: true })).toEqual({
			success: false,
			error: new ZodError([
				{
					code: 'invalid_type',
					expected: 'string',
					received: 'undefined',
					path: ['a'],
					message: 'Required',
				},
				{
					code: 'invalid_type',
					expected: 'number',
					received: 'string',
					path: ['b'],
					message: 'Expected number, received string',
				},
			]),
		});
	});

	test('Functional tests - properties and additionalProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			required: ['a'],
			properties: {
				a: {
					type: 'string',
				},
				b: {
					type: 'number',
				},
			},
			additionalProperties: { type: 'boolean' },
		};

		const expected = z.object({ a: z.string(), b: z.number().optional() }).catchall(z.boolean());

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);

		expect(run(result, { b: 'hello', x: 'true' })).toEqual({
			success: false,
			error: new ZodError([
				{
					code: 'invalid_type',
					expected: 'string',
					received: 'undefined',
					path: ['a'],
					message: 'Required',
				},
				{
					code: 'invalid_type',
					expected: 'number',
					received: 'string',
					path: ['b'],
					message: 'Expected number, received string',
				},
				{
					code: 'invalid_type',
					expected: 'boolean',
					received: 'string',
					path: ['x'],
					message: 'Expected boolean, received string',
				},
			]),
		});
	});

	test('Functional tests - properties and single-item patternProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			required: ['a'],
			properties: {
				a: {
					type: 'string',
				},
				b: {
					type: 'number',
				},
			},
			patternProperties: {
				'\\.': { type: 'array' },
			},
		};

		const expected = z
			.object({ a: z.string(), b: z.number().optional() })
			.catchall(z.array(z.any()))
			.superRefine((value, ctx) => {
				for (const key in value) {
					if (key.match(new RegExp('\\\\.'))) {
						const result = z.array(z.any()).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
				}
			});

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);

		expect(run(result, { a: 'a', b: 2, '.': [] })).toEqual({
			success: true,
			data: { a: 'a', b: 2, '.': [] },
		});

		expect(run(result, { a: 'a', b: 2, '.': '[]' })).toEqual({
			success: false,
			error: new ZodError([
				{
					code: 'invalid_type',
					expected: 'array',
					received: 'string',
					path: ['.'],
					message: 'Expected array, received string',
				},
			]),
		});
	});

	test('Functional tests - properties, additionalProperties and patternProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			required: ['a'],
			properties: {
				a: {
					type: 'string',
				},
				b: {
					type: 'number',
				},
			},
			additionalProperties: { type: 'boolean' },
			patternProperties: {
				'\\.': { type: 'array' },
				'\\,': { type: 'array', minItems: 1 },
			},
		};

		const expected = z
			.object({ a: z.string(), b: z.number().optional() })
			.catchall(z.union([z.array(z.any()), z.array(z.any()).min(1), z.boolean()]))
			.superRefine((value, ctx) => {
				for (const key in value) {
					let evaluated = ['a', 'b'].includes(key);
					if (key.match(new RegExp('\\\\.'))) {
						evaluated = true;
						const result = z.array(z.any()).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
					if (key.match(new RegExp('\\\\,'))) {
						evaluated = true;
						const result = z.array(z.any()).min(1).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
					if (!evaluated) {
						const result = z.boolean().safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: 'Invalid input: must match catchall schema',
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
				}
			});

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);
	});

	test('Functional tests - additionalProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			additionalProperties: { type: 'boolean' },
		};

		const expected = z.record(z.boolean());

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);
	});

	test('Functional tests - additionalProperties and patternProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			additionalProperties: { type: 'boolean' },
			patternProperties: {
				'\\.': { type: 'array' },
				'\\,': { type: 'array', minItems: 1 },
			},
		};

		const expected = z
			.record(z.union([z.array(z.any()), z.array(z.any()).min(1), z.boolean()]))
			.superRefine((value, ctx) => {
				for (const key in value) {
					let evaluated = false;
					if (key.match(new RegExp('\\\\.'))) {
						evaluated = true;
						const result = z.array(z.any()).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
					if (key.match(new RegExp('\\\\,'))) {
						evaluated = true;
						const result = z.array(z.any()).min(1).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
					if (!evaluated) {
						const result = z.boolean().safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: 'Invalid input: must match catchall schema',
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
				}
			});

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);

		expect(run(result, { x: true, '.': [], ',': [] })).toEqual({
			success: false,
			error: new ZodError([
				{
					path: [','],
					code: 'custom',
					message: 'Invalid input: Key matching regex /,/ must match schema',
					params: {
						issues: [
							{
								code: 'too_small',
								minimum: 1,
								type: 'array',
								inclusive: true,
								exact: false,
								message: 'Array must contain at least 1 element(s)',
								path: [],
							},
						],
					},
				},
			]),
		});
	});

	test('Functional tests - single-item patternProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			patternProperties: {
				'\\.': { type: 'array' },
			},
		};

		const expected = z.record(z.array(z.any())).superRefine((value, ctx) => {
			for (const key in value) {
				if (key.match(new RegExp('\\\\.'))) {
					const result = z.array(z.any()).safeParse(value[key]);
					if (!result.success) {
						ctx.addIssue({
							path: [...ctx.path, key],
							code: 'custom',
							message: `Invalid input: Key matching regex /${key}/ must match schema`,
							params: {
								issues: result.error.issues,
							},
						});
					}
				}
			}
		});

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);
	});

	test('Functional tests - patternProperties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			patternProperties: {
				'\\.': { type: 'array' },
				'\\,': { type: 'array', minItems: 1 },
			},
		};

		const expected = z
			.record(z.union([z.array(z.any()), z.array(z.any()).min(1)]))
			.superRefine((value, ctx) => {
				for (const key in value) {
					if (key.match(new RegExp('\\.'))) {
						const result = z.array(z.any()).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
					if (key.match(new RegExp('\\,'))) {
						const result = z.array(z.any()).min(1).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
				}
			});

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(run(result, { '.': [] })).toEqual({
			success: true,
			data: { '.': [] },
		});

		expect(run(result, { ',': [] })).toEqual({
			success: false,
			error: new ZodError([
				{
					path: [','],
					code: 'custom',
					message: 'Invalid input: Key matching regex /,/ must match schema',
					params: {
						issues: [
							{
								code: 'too_small',
								minimum: 1,
								type: 'array',
								inclusive: true,
								exact: false,
								message: 'Array must contain at least 1 element(s)',
								path: [],
							},
						],
					},
				},
			]),
		});

		expect(result).toMatchZod(expected);
	});

	test('Functional tests - patternProperties and properties', () => {
		const schema: JSONSchema7 & { type: 'object' } = {
			type: 'object',
			required: ['a'],
			properties: {
				a: {
					type: 'string',
				},
				b: {
					type: 'number',
				},
			},
			patternProperties: {
				'\\.': { type: 'array' },
				'\\,': { type: 'array', minItems: 1 },
			},
		};

		const expected = z
			.object({ a: z.string(), b: z.number().optional() })
			.catchall(z.union([z.array(z.any()), z.array(z.any()).min(1)]))
			.superRefine((value, ctx) => {
				for (const key in value) {
					if (key.match(new RegExp('\\.'))) {
						const result = z.array(z.any()).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
					if (key.match(new RegExp('\\,'))) {
						const result = z.array(z.any()).min(1).safeParse(value[key]);
						if (!result.success) {
							ctx.addIssue({
								path: [...ctx.path, key],
								code: 'custom',
								message: `Invalid input: Key matching regex /${key}/ must match schema`,
								params: {
									issues: result.error.issues,
								},
							});
						}
					}
				}
			});

		const result = parseObject(schema, { path: [], seen: new Map() });

		expect(result).toMatchZod(expected);
	});
});
