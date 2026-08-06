import { z } from 'zod';
import * as z4 from 'zod/v4';
import * as z4mini from 'zod/v4-mini';

import { toJsonSchemaOrNull, toModelJsonSchema, toValidationJsonSchema } from '../zod';

describe('toModelJsonSchema', () => {
	it('closes objects so provider schemas stay strict', () => {
		const result = toModelJsonSchema(z.object({ query: z.string() }));

		expect(result).toMatchObject({ additionalProperties: false });
	});

	it('returns a raw JSON Schema unchanged', () => {
		const schema = { type: 'object' as const, additionalProperties: false };

		expect(toModelJsonSchema(schema)).toBe(schema);
	});

	it('returns null for a missing schema', () => {
		expect(toModelJsonSchema(undefined)).toBeNull();
	});
});

describe('toValidationJsonSchema', () => {
	it('leaves objects open to unknown keys', () => {
		const result = toValidationJsonSchema(z.object({ approved: z.boolean() }));

		expect(result).toMatchObject({ additionalProperties: true });
	});

	it('leaves nested objects open to unknown keys', () => {
		const result = toValidationJsonSchema(
			z.object({ credentials: z.object({ apiKey: z.string() }) }),
		);

		expect(result?.properties?.credentials).toMatchObject({ additionalProperties: true });
	});

	it('keeps objects declared strict closed', () => {
		const result = toValidationJsonSchema(z.object({ approved: z.boolean() }).strict());

		expect(result).toMatchObject({ additionalProperties: false });
	});

	it('returns a raw JSON Schema unchanged', () => {
		const schema = { type: 'object' as const, additionalProperties: false };

		expect(toValidationJsonSchema(schema)).toBe(schema);
	});

	it('returns null for a missing schema', () => {
		expect(toValidationJsonSchema(undefined)).toBeNull();
	});
});

describe('Zod 4 schemas', () => {
	it('serializes a v4 schema rather than collapsing it to an empty schema', () => {
		const result = toValidationJsonSchema(z4.object({ approved: z4.boolean() }));

		expect(result).toMatchObject({
			type: 'object',
			properties: { approved: { type: 'boolean' } },
			required: ['approved'],
		});
	});

	it('serializes a v4-mini schema', () => {
		const result = toValidationJsonSchema(z4mini.object({ approved: z4mini.boolean() }));

		expect(result).toMatchObject({ properties: { approved: { type: 'boolean' } } });
	});

	it('leaves a v4 object open to unknown keys for validation', () => {
		const result = toValidationJsonSchema(z4.object({ approved: z4.boolean() }));

		expect(result?.additionalProperties).toBeUndefined();
	});

	it('closes a v4 object for the model', () => {
		const result = toModelJsonSchema(
			z4.object({ approved: z4.boolean(), nested: z4.object({ a: z4.string() }) }),
		);

		expect(result).toMatchObject({ additionalProperties: false });
		expect(result?.properties?.nested).toMatchObject({ additionalProperties: false });
	});

	it('keeps a v4 strictObject closed for validation', () => {
		const result = toValidationJsonSchema(z4.strictObject({ approved: z4.boolean() }));

		expect(result).toMatchObject({ additionalProperties: false });
	});

	it('keeps a v4 looseObject open for the model', () => {
		const result = toModelJsonSchema(z4.looseObject({ approved: z4.boolean() }));

		expect(result?.additionalProperties).not.toBe(false);
	});

	it('emits the same dialect as the v3 branch', () => {
		expect(toValidationJsonSchema(z4.object({ a: z4.string() }))).toMatchObject({
			$schema: 'http://json-schema.org/draft-07/schema#',
		});
		expect(toValidationJsonSchema(z.object({ a: z.string() }))).toMatchObject({
			$schema: 'http://json-schema.org/draft-07/schema#',
		});
	});

	it('degrades an unrepresentable leaf instead of failing the whole schema', () => {
		const result = toModelJsonSchema(z4.object({ id: z4.string(), when: z4.date() }));

		expect(result?.properties?.id).toMatchObject({ type: 'string' });
		expect(result?.properties?.when).toBeDefined();
	});

	it('serializes an output schema in the output direction', () => {
		const schema = z4.object({ id: z4.string().default('x') });

		expect(toModelJsonSchema(schema, 'output')).toMatchObject({ required: ['id'] });
		expect(toModelJsonSchema(schema)?.required).toBeUndefined();
	});
});

describe('toJsonSchemaOrNull', () => {
	const unserializable = {
		safeParse: () => ({ success: true }),
		_def: {
			get typeName(): string {
				throw new Error('boom');
			},
		},
	};

	it('returns null instead of throwing when serialization fails', () => {
		expect(toJsonSchemaOrNull(unserializable, 'validation')).toBeNull();
	});

	it('hands the swallowed cause to onError', () => {
		const onError = vi.fn();

		expect(toJsonSchemaOrNull(unserializable, 'validation', onError)).toBeNull();
		expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
	});

	it('does not call onError when serialization succeeds', () => {
		const onError = vi.fn();

		toJsonSchemaOrNull(z.object({ a: z.string() }), 'validation', onError);
		expect(onError).not.toHaveBeenCalled();
	});

	it('ignores the direction for a v3 schema', () => {
		const schema = z.object({ id: z.string().default('x') });

		expect(toModelJsonSchema(schema, 'output')).toEqual(toModelJsonSchema(schema, 'input'));
	});
});
