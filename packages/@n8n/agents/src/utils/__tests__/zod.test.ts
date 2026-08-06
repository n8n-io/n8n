import { z } from 'zod';
import * as z4 from 'zod/v4';
import * as z4mini from 'zod/v4-mini';

import { toModelJsonSchema } from '../zod';

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

	it('ignores the direction for a v3 schema', () => {
		const schema = z.object({ id: z.string().default('x') });

		expect(toModelJsonSchema(schema, 'output')).toEqual(toModelJsonSchema(schema, 'input'));
	});
});

describe('Zod 4 schemas', () => {
	it('serializes a v4 schema rather than collapsing it to an empty schema', () => {
		const result = toModelJsonSchema(z4.object({ approved: z4.boolean() }));

		expect(result).toMatchObject({
			type: 'object',
			properties: { approved: { type: 'boolean' } },
			required: ['approved'],
		});
	});

	it('serializes a v4-mini schema', () => {
		const result = toModelJsonSchema(z4mini.object({ approved: z4mini.boolean() }));

		expect(result).toMatchObject({ properties: { approved: { type: 'boolean' } } });
	});

	it('closes a v4 object and its nested objects for the model', () => {
		const result = toModelJsonSchema(
			z4.object({ approved: z4.boolean(), nested: z4.object({ a: z4.string() }) }),
		);

		expect(result).toMatchObject({ additionalProperties: false });
		expect(result?.properties?.nested).toMatchObject({ additionalProperties: false });
	});

	it('keeps a v4 looseObject open for the model', () => {
		const result = toModelJsonSchema(z4.looseObject({ approved: z4.boolean() }));

		expect(result?.additionalProperties).not.toBe(false);
	});

	it('emits the same dialect as the v3 branch', () => {
		expect(toModelJsonSchema(z4.object({ a: z4.string() }))).toMatchObject({
			$schema: 'http://json-schema.org/draft-07/schema#',
		});
		expect(toModelJsonSchema(z.object({ a: z.string() }))).toMatchObject({
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
