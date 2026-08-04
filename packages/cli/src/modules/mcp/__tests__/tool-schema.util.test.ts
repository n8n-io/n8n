import { z } from 'zod';

import { shapeToStandardSchema } from '../tool-schema.util';

describe('shapeToStandardSchema', () => {
	const schema = shapeToStandardSchema({
		query: z.string().optional().describe('search text'),
		limit: z.number().int().min(1),
	});

	it('advertises the shape as JSON Schema without a $schema marker', () => {
		const json = schema['~standard'].jsonSchema.input({ target: 'draft-2020-12' });

		expect(json.$schema).toBeUndefined();
		expect(json).toMatchObject({
			type: 'object',
			properties: {
				query: { type: 'string', description: 'search text' },
				limit: { type: 'integer', minimum: 1 },
			},
			required: ['limit'],
		});
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
