import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { parseWithSchema } from '../utils/parse';

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
