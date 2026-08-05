import { z } from 'zod';

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

describe('toJsonSchemaOrNull', () => {
	it('returns null instead of throwing when serialization fails', () => {
		const unserializable = {
			safeParse: () => ({ success: true }),
			_def: {
				get typeName(): string {
					throw new Error('boom');
				},
			},
		};

		expect(toJsonSchemaOrNull(unserializable, 'validation')).toBeNull();
	});
});
