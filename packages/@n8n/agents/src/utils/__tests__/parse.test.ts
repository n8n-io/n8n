import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { parseWithSchema } from '../parse';
import { zodToJsonSchema } from '../zod';

// ---------------------------------------------------------------------------
// parseWithSchema — Zod schemas
// ---------------------------------------------------------------------------

describe('parseWithSchema — Zod schemas', () => {
	it('returns success with parsed data for valid input', async () => {
		const schema = z.object({ name: z.string(), age: z.number() });
		const result = await parseWithSchema(schema, { name: 'Alice', age: 30 });

		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual({ name: 'Alice', age: 30 });
	});

	it('coerces and transforms values as defined in the schema', async () => {
		const schema = z.object({ id: z.string().transform((s) => s.toUpperCase()) });
		const result = await parseWithSchema(schema, { id: 'abc' });

		expect(result.success).toBe(true);
		if (result.success) expect((result.data as { id: string }).id).toBe('ABC');
	});

	it('returns failure with an error message for wrong type', async () => {
		const schema = z.object({ count: z.number() });
		const result = await parseWithSchema(schema, { count: 'not-a-number' });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBeTruthy();
	});

	it('returns failure when a required field is missing', async () => {
		const schema = z.object({ name: z.string(), age: z.number() });
		const result = await parseWithSchema(schema, { name: 'Alice' });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toMatch(/required/i);
	});

	it('returns failure when a value violates a refinement', async () => {
		const schema = z.object({ age: z.number().min(18, 'must be at least 18') });
		const result = await parseWithSchema(schema, { age: 5 });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('must be at least 18');
	});
});

// ---------------------------------------------------------------------------
// parseWithSchema — JSON Schema (AJV)
// ---------------------------------------------------------------------------

describe('parseWithSchema — JSON Schema', () => {
	it('returns success with the original data for valid input', async () => {
		const schema = {
			type: 'object' as const,
			properties: { name: { type: 'string' }, age: { type: 'integer' } },
			required: ['name', 'age'],
		} as JSONSchema7;
		const result = await parseWithSchema(schema, { name: 'Bob', age: 25 });

		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual({ name: 'Bob', age: 25 });
	});

	it('returns failure when a property has the wrong type', async () => {
		const schema = {
			type: 'object' as const,
			properties: { id: { type: 'string' } },
			required: ['id'],
		} as JSONSchema7;
		const result = await parseWithSchema(schema, { id: 42 });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBeTruthy();
	});

	it('returns failure when a required property is missing', async () => {
		const schema = {
			type: 'object' as const,
			properties: {
				name: { type: 'string' },
				age: { type: 'integer' },
			},
			required: ['name', 'age'],
		} as JSONSchema7;
		const result = await parseWithSchema(schema, { name: 'Alice' });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBeTruthy();
	});

	it('returns failure when a numeric constraint is violated', async () => {
		const schema = {
			type: 'object' as const,
			properties: { age: { type: 'integer', minimum: 18, maximum: 99 } },
			required: ['age'],
		} as JSONSchema7;

		const tooLow = await parseWithSchema(schema, { age: 5 });
		expect(tooLow.success).toBe(false);

		const tooHigh = await parseWithSchema(schema, { age: 150 });
		expect(tooHigh.success).toBe(false);

		const valid = await parseWithSchema(schema, { age: 30 });
		expect(valid.success).toBe(true);
	});

	it('returns failure for an enum constraint violation', async () => {
		const schema = {
			type: 'object' as const,
			properties: { status: { type: 'string', enum: ['active', 'inactive'] } },
			required: ['status'],
		} as JSONSchema7;

		const invalid = await parseWithSchema(schema, { status: 'pending' });
		expect(invalid.success).toBe(false);

		const valid = await parseWithSchema(schema, { status: 'active' });
		expect(valid.success).toBe(true);
	});

	it('uses Unicode regex semantics by default', async () => {
		const schema = {
			type: 'object' as const,
			properties: { value: { type: 'string', pattern: '^.$' } },
			required: ['value'],
		} as JSONSchema7;

		const result = await parseWithSchema(schema, { value: '😀' });

		expect(result.success).toBe(true);
	});

	it('tolerates patterns that are invalid under the regex u flag', async () => {
		const schema = {
			type: 'object' as const,
			properties: { value: { type: 'string', pattern: '[\\w-.]' } },
			required: ['value'],
		} as JSONSchema7;

		const valid = await parseWithSchema(schema, { value: 'a' });
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, { value: '@' });
		expect(invalid.success).toBe(false);
	});

	it('validates nested object properties', async () => {
		const schema = {
			type: 'object' as const,
			properties: {
				address: {
					type: 'object',
					properties: { zip: { type: 'string' } },
					required: ['zip'],
				},
			},
			required: ['address'],
		} as JSONSchema7;

		const valid = await parseWithSchema(schema, { address: { zip: '10001' } });
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, { address: { zip: 12345 } });
		expect(invalid.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// parseWithSchema — JSON Schema dialects
// ---------------------------------------------------------------------------

describe('parseWithSchema — JSON Schema dialects', () => {
	it('compiles a schema declaring the 2020-12 dialect', async () => {
		const schema = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'object' as const,
			properties: { name: { type: 'string' } },
			required: ['name'],
		} as JSONSchema7;

		const valid = await parseWithSchema(schema, { name: 'Bob' });
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, { name: 42 });
		expect(invalid.success).toBe(false);
	});

	it('honours 2020-12 tuple semantics via prefixItems', async () => {
		const schema = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'array' as const,
			prefixItems: [{ type: 'string' }, { type: 'number' }],
		} as unknown as JSONSchema7;

		const valid = await parseWithSchema(schema, ['a', 1]);
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, [1, 'a']);
		expect(invalid.success).toBe(false);
	});

	it('compiles a schema declaring the draft-07 dialect', async () => {
		const schema = {
			$schema: 'http://json-schema.org/draft-07/schema#',
			type: 'object' as const,
			properties: { name: { type: 'string' } },
			required: ['name'],
		} as JSONSchema7;

		const valid = await parseWithSchema(schema, { name: 'Bob' });
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, {});
		expect(invalid.success).toBe(false);
	});

	it('honours draft-07 tuple semantics via array-valued items', async () => {
		const schema = {
			$schema: 'http://json-schema.org/draft-07/schema#',
			type: 'array' as const,
			items: [{ type: 'string' }, { type: 'number' }],
		} as JSONSchema7;

		const valid = await parseWithSchema(schema, ['a', 1]);
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, [1, 'a']);
		expect(invalid.success).toBe(false);
	});

	it('does not fall back to another dialect when the declared one rejects the schema', async () => {
		// Array-valued `items` is a draft-07 tuple, which 2020-12 cannot compile.
		const schema = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'array' as const,
			items: [{ type: 'string' }, { type: 'number' }],
		} as JSONSchema7;

		const result = await parseWithSchema(schema, ['a', 1]);

		expect(result.success).toBe(false);
		if (!result.success) expect(result.schemaInvalid).toBe(true);
	});

	it('falls back to the legacy bundle for an undeclared draft-07 tuple', async () => {
		const schema = {
			type: 'array' as const,
			items: [{ type: 'string' }, { type: 'number' }],
		} as JSONSchema7;

		const valid = await parseWithSchema(schema, ['a', 1]);
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, [1, 'a']);
		expect(invalid.success).toBe(false);
	});

	it('honours 2019-09 keyword semantics via unevaluatedProperties', async () => {
		const schema = {
			$schema: 'https://json-schema.org/draft/2019-09/schema',
			type: 'object' as const,
			properties: { name: { type: 'string' } },
			unevaluatedProperties: false,
		} as unknown as JSONSchema7;

		const valid = await parseWithSchema(schema, { name: 'Bob' });
		expect(valid.success).toBe(true);

		const invalid = await parseWithSchema(schema, { name: 'Bob', extra: true });
		expect(invalid.success).toBe(false);
	});

	it('reports the schema as the defect when it compiles on no dialect', async () => {
		const schema = { type: 'objct' } as unknown as JSONSchema7;

		const result = await parseWithSchema(schema, { anything: true });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Schema could not be compiled');
			expect(result.schemaInvalid).toBe(true);
		}
	});

	it('does not flag invalid data as a schema defect', async () => {
		const schema = {
			type: 'object' as const,
			properties: { name: { type: 'string' } },
			required: ['name'],
		} as JSONSchema7;

		const result = await parseWithSchema(schema, {});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.schemaInvalid).toBeUndefined();
	});

	it('keeps validating on the fallback bundle across repeated calls', async () => {
		const schema = {
			type: 'array' as const,
			items: [{ type: 'string' }, { type: 'number' }],
		} as JSONSchema7;

		for (let i = 0; i < 3; i++) {
			expect((await parseWithSchema(schema, ['a', 1])).success).toBe(true);
			expect((await parseWithSchema(schema, [1, 'a'])).success).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// parseWithSchema — schemas that declare an $id
// ---------------------------------------------------------------------------

describe('parseWithSchema — schemas that declare an $id', () => {
	const withId = (): JSONSchema7 =>
		({
			$id: 'https://example.com/parse-test/tool-input',
			type: 'object' as const,
			properties: { q: { type: 'string' } },
			required: ['q'],
		}) as JSONSchema7;

	it('keeps validating separate copies of a schema that declares an $id', async () => {
		for (let i = 0; i < 8; i++) {
			const schema = withId();
			expect((await parseWithSchema(schema, { q: 'x' })).success).toBe(true);
			const invalid = await parseWithSchema(schema, {});
			expect(invalid.success).toBe(false);
			if (!invalid.success) expect(invalid.schemaInvalid).toBeUndefined();
		}
	});

	it('resolves a recursive $ref back to the root $id', async () => {
		const schema = {
			$id: 'https://example.com/parse-test/node',
			type: 'object' as const,
			properties: {
				name: { type: 'string' },
				next: { $ref: 'https://example.com/parse-test/node' },
			},
			required: ['name'],
		} as unknown as JSONSchema7;

		expect((await parseWithSchema(schema, { name: 'a', next: { name: 'b' } })).success).toBe(true);
		const invalid = await parseWithSchema(schema, { name: 'a', next: { name: 1 } });
		expect(invalid.success).toBe(false);
		if (!invalid.success) expect(invalid.schemaInvalid).toBeUndefined();
	});

	it('resolves internal $refs without registering the schema globally', async () => {
		const schema = {
			$id: 'https://example.com/parse-test/with-defs',
			type: 'object' as const,
			properties: { inner: { $ref: '#/$defs/Inner' } },
			required: ['inner'],
			$defs: { Inner: { type: 'object', properties: { n: { type: 'number' } }, required: ['n'] } },
		} as unknown as JSONSchema7;

		expect((await parseWithSchema(schema, { inner: { n: 1 } })).success).toBe(true);
		expect((await parseWithSchema(schema, { inner: { n: 'no' } })).success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// parseWithSchema — error reporting
// ---------------------------------------------------------------------------

describe('parseWithSchema — error reporting', () => {
	it('reports every violation, not just the first', async () => {
		const schema = {
			type: 'object' as const,
			properties: { name: { type: 'string' }, age: { type: 'integer' } },
			required: ['name', 'age'],
		} as JSONSchema7;

		const result = await parseWithSchema(schema, {});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('name');
			expect(result.error).toContain('age');
		}
	});
});

// ---------------------------------------------------------------------------
// parseWithSchema — stripUnknown
// ---------------------------------------------------------------------------

describe('parseWithSchema — stripUnknown', () => {
	const strictSchema = {
		type: 'object' as const,
		properties: { approved: { type: 'boolean' } },
		required: ['approved'],
		additionalProperties: false,
	} as JSONSchema7;

	it('rejects undeclared properties by default', async () => {
		const result = await parseWithSchema(strictSchema, { approved: true, userInput: 'hi' });

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('additional properties');
	});

	it('drops undeclared properties when enabled, leaving the input untouched', async () => {
		const data = { approved: true, userInput: 'hi' };
		const result = await parseWithSchema(strictSchema, data, { stripUnknown: true });

		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual({ approved: true });
		expect(data).toEqual({ approved: true, userInput: 'hi' });
	});

	it('drops undeclared properties from nested objects', async () => {
		const schema = {
			type: 'object' as const,
			properties: {
				answer: {
					type: 'object',
					properties: { questionId: { type: 'string' } },
					required: ['questionId'],
					additionalProperties: false,
				},
			},
			required: ['answer'],
			additionalProperties: false,
		} as JSONSchema7;

		const result = await parseWithSchema(
			schema,
			{ answer: { questionId: 'q1', skipped: true } },
			{ stripUnknown: true },
		);

		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual({ answer: { questionId: 'q1' } });
	});

	it('still fails on a declared property with the wrong type', async () => {
		const result = await parseWithSchema(
			strictSchema,
			{ approved: 'yes', userInput: 'hi' },
			{ stripUnknown: true },
		);

		expect(result.success).toBe(false);
	});

	it('keeps properties a later anyOf branch declares', async () => {
		const unionSchema = {
			anyOf: [
				strictSchema,
				{
					type: 'object',
					properties: {
						approved: { type: 'boolean' },
						answers: { type: 'array', items: { type: 'string' } },
					},
					required: ['approved'],
					additionalProperties: false,
				},
			],
		} as JSONSchema7;

		const result = await parseWithSchema(
			unionSchema,
			{ approved: true, answers: ['a'] },
			{ stripUnknown: true },
		);

		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual({ approved: true, answers: ['a'] });
	});
});

describe('parseWithSchema — Zod→JSON Schema approval envelope round-trip', () => {
	it('accepts envelope fields from zodToJsonSchema without stripUnknown', async () => {
		const resumeSchema = z.object({
			approved: z.boolean(),
			userInput: z.string().optional(),
			scope: z.enum(['once', 'session']).optional(),
		});
		const jsonSchema = zodToJsonSchema(resumeSchema);
		expect(jsonSchema).not.toBeNull();

		const envelope = {
			approved: true,
			userInput: 'rename it first',
			scope: 'session' as const,
		};
		const result = await parseWithSchema(jsonSchema!, envelope);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual(envelope);
	});
});
