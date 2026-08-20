import { z } from 'zod';

import { shapeToStandardSchema } from '../tool-schema.util';

describe('shapeToStandardSchema', () => {
	const schema = shapeToStandardSchema({
		query: z.string().optional().describe('search text'),
		limit: z.number().int().min(1),
	});

	// Claude Desktop and other strict clients reject a tool whose schema declares
	// draft-07, and MCP requires every client to support 2020-12.
	it('advertises the shape as JSON Schema 2020-12', () => {
		const json = schema['~standard'].jsonSchema.input({ target: 'draft-2020-12' });

		expect(json.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
		expect(json).toMatchObject({
			type: 'object',
			properties: {
				query: { type: 'string', description: 'search text' },
				limit: { type: 'integer', minimum: 1 },
			},
			required: ['limit'],
		});
	});

	it('advertises tuples with the 2020-12 keywords', () => {
		const withTuple = shapeToStandardSchema({
			range: z.tuple([z.number(), z.number()]).rest(z.number()),
		});

		const json = withTuple['~standard'].jsonSchema.input({ target: 'draft-2020-12' });

		expect(json.properties).toMatchObject({
			range: {
				type: 'array',
				prefixItems: [{ type: 'number' }, { type: 'number' }],
				items: { type: 'number' },
			},
		});
		expect(JSON.stringify(json)).not.toContain('additionalItems');
	});

	it('declares the same dialect on input and output', () => {
		const standard = schema['~standard'];

		expect(standard.jsonSchema.output({ target: 'draft-2020-12' }).$schema).toBe(
			standard.jsonSchema.input({ target: 'draft-2020-12' }).$schema,
		);
	});

	it('validates through the original zod object', async () => {
		const good = await schema['~standard'].validate({ query: 'hi', limit: 3 });
		expect(good).toEqual({ value: { query: 'hi', limit: 3 } });

		const bad = await schema['~standard'].validate({ limit: 0 });
		expect('issues' in bad && bad.issues).toEqual([
			expect.objectContaining({ path: ['limit'], message: expect.any(String) }),
		]);
	});

	it('strips unknown keys like the zod object it wraps', async () => {
		const result = await schema['~standard'].validate({ limit: 1, extra: 'x' });
		expect(result).toEqual({ value: { limit: 1 } });
	});

	// The v2 SDK validates a tool's returned value against its declared
	// outputSchema. Tools that report handled failures in structured output
	// (execute_workflow, test_workflow, get_execution, …) return an error-marker
	// shape instead of the success fields, so their output schema admits an
	// 'error' status, keeps `error` optional, and makes success-only fields
	// nullable. This locks that a handled-error payload still validates, so the
	// output check can't turn a reported failure into a protocol error.
	it('accepts a handled-error payload for a tool that reports failures in structured output', async () => {
		const output = shapeToStandardSchema({
			executionId: z.string().nullable(),
			status: z.enum(['success', 'error', 'running']),
			error: z.string().optional(),
		});

		const handledError = await output['~standard'].validate({
			executionId: null,
			status: 'error',
			error: 'workflow failed',
		});

		expect(handledError).toEqual({
			value: { executionId: null, status: 'error', error: 'workflow failed' },
		});
	});
});
