import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { zodToJsonSchema } from './zod-to-json-schema';

describe('zodToJsonSchema', () => {
	it('converts a Zod schema to draft-07 JSON Schema', () => {
		expect(zodToJsonSchema(z.object({ name: z.string() }))).toMatchObject({
			type: 'object',
			properties: { name: { type: 'string' } },
		});
	});

	it('prefers a schema native converter when available', () => {
		const expected: JSONSchema7 = { type: 'string' };
		const schema = z.string();
		Object.assign(schema, { toJSONSchema: () => expected });

		expect(zodToJsonSchema(schema)).toBe(expected);
	});

	it('passes raw JSON Schema objects through unchanged', () => {
		const schema: JSONSchema7 = { type: 'object' };

		expect(zodToJsonSchema(schema)).toBe(schema);
	});

	it.each([undefined, null, '', 42])('returns null for unsupported input %s', (value) => {
		expect(zodToJsonSchema(value)).toBeNull();
	});

	it('returns null when schema conversion fails', () => {
		const schema = {
			safeParse: () => ({ success: true }),
			toJSONSchema: () => {
				throw new Error('conversion failed');
			},
		};

		expect(zodToJsonSchema(schema)).toBeNull();
	});
});
