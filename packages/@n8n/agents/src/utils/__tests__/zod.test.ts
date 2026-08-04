import { z } from 'zod';

import { zodToJsonSchema } from '../zod';

describe('zodToJsonSchema', () => {
	it('closes objects by default so provider schemas stay strict', () => {
		const result = zodToJsonSchema(z.object({ query: z.string() }));

		expect(result).toMatchObject({ additionalProperties: false });
	});

	it('leaves objects open to unknown keys when closeObjects is off', () => {
		const result = zodToJsonSchema(z.object({ approved: z.boolean() }), { closeObjects: false });

		expect(result).toMatchObject({ additionalProperties: true });
	});

	it('leaves nested objects open to unknown keys when closeObjects is off', () => {
		const result = zodToJsonSchema(z.object({ credentials: z.object({ apiKey: z.string() }) }), {
			closeObjects: false,
		});

		expect(result?.properties?.credentials).toMatchObject({ additionalProperties: true });
	});

	it('keeps objects declared strict closed when closeObjects is off', () => {
		const result = zodToJsonSchema(z.object({ approved: z.boolean() }).strict(), {
			closeObjects: false,
		});

		expect(result).toMatchObject({ additionalProperties: false });
	});

	it('returns a raw JSON Schema unchanged', () => {
		const schema = { type: 'object' as const, additionalProperties: false };

		expect(zodToJsonSchema(schema, { closeObjects: false })).toBe(schema);
	});

	it('returns null for a missing schema', () => {
		expect(zodToJsonSchema(undefined)).toBeNull();
	});
});
