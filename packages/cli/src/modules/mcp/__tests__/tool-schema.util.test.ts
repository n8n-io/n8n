import { z } from 'zod';

import { shapeToStandardSchema } from '../tool-schema.util';
import { workflowInputsSchema } from '../tools/workflow-inputs';

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

	describe('decodeJsonStringArgs', () => {
		const shape = {
			workflowId: z.string().optional(),
			status: z.array(z.enum(['error', 'success'])).optional(),
			limit: z.number().int().min(1).optional(),
			dryRun: z.boolean().optional(),
			node: z
				.object({
					name: z.string(),
					position: z.array(z.number()).length(2).optional(),
				})
				.optional(),
		};
		const lenient = shapeToStandardSchema(shape, { decodeJsonStringArgs: true });

		// Some MCP clients send typed arguments as JSON-encoded strings.
		it('decodes JSON strings sent for array, number and boolean arguments', async () => {
			const result = await lenient['~standard'].validate({
				workflowId: 'wf-1',
				status: '["error"]',
				limit: '4',
				dryRun: 'true',
			});

			expect(result).toEqual({
				value: { workflowId: 'wf-1', status: ['error'], limit: 4, dryRun: true },
			});
		});

		it('decodes nested JSON strings inside a JSON-encoded object', async () => {
			const result = await lenient['~standard'].validate({
				node: JSON.stringify({ name: 'Set', position: '[10, 20]' }),
			});

			expect(result).toEqual({ value: { node: { name: 'Set', position: [10, 20] } } });
		});

		// Zod nests the type issues of each union option under `invalid_union`.
		it('decodes a JSON string sent for a union of object schemas', async () => {
			const withUnion = shapeToStandardSchema(
				{ inputs: workflowInputsSchema.optional() },
				{ decodeJsonStringArgs: true },
			);

			const result = await withUnion['~standard'].validate({
				inputs: '{"chatInput":"hello"}',
			});

			expect(result).toEqual({ value: { inputs: { chatInput: 'hello' } } });
		});

		it('decodes a JSON string nested inside a union option', async () => {
			const withUnion = shapeToStandardSchema(
				{ inputs: workflowInputsSchema.optional() },
				{ decodeJsonStringArgs: true },
			);

			const result = await withUnion['~standard'].validate({
				inputs: { webhookData: '{"method":"POST","body":{"id":1}}' },
			});

			expect(result).toEqual({
				value: { inputs: { webhookData: { method: 'POST', body: { id: 1 } } } },
			});
		});

		it('decodes a JSON string for a union of array and number', async () => {
			const withUnion = shapeToStandardSchema(
				{ ids: z.union([z.array(z.number()), z.number()]) },
				{ decodeJsonStringArgs: true },
			);

			expect(await withUnion['~standard'].validate({ ids: '[1,2]' })).toEqual({
				value: { ids: [1, 2] },
			});
			expect(await withUnion['~standard'].validate({ ids: '3' })).toEqual({
				value: { ids: 3 },
			});
		});

		it('keeps string arguments as strings', async () => {
			const result = await lenient['~standard'].validate({ workflowId: '123' });

			expect(result).toEqual({ value: { workflowId: '123' } });
		});

		it('reports the original issue when the string does not decode to the expected type', async () => {
			const result = await lenient['~standard'].validate({ status: '"error"', limit: 'four' });

			expect('issues' in result && result.issues).toEqual([
				expect.objectContaining({ path: ['status'] }),
				expect.objectContaining({ path: ['limit'] }),
			]);
		});

		it('reports constraint issues on the decoded value', async () => {
			const result = await lenient['~standard'].validate({ status: '["bogus"]', limit: '0' });

			expect('issues' in result && result.issues).toEqual([
				expect.objectContaining({ path: ['status', 0] }),
				expect.objectContaining({ path: ['limit'] }),
			]);
		});

		it('does not modify the input object', async () => {
			const input = { status: '["error"]' };

			await lenient['~standard'].validate(input);

			expect(input).toEqual({ status: '["error"]' });
		});

		it('rejects JSON strings when the option is off', async () => {
			const strict = shapeToStandardSchema(shape);

			const result = await strict['~standard'].validate({ status: '["error"]', limit: '4' });

			expect('issues' in result && result.issues).toEqual([
				expect.objectContaining({ path: ['status'] }),
				expect.objectContaining({ path: ['limit'] }),
			]);
		});
	});

	// A Zod instance reused across two properties must be inlined at both use
	// sites. The generator's default strategy dedupes the second occurrence into
	// a `$ref` to a `#/properties/...` path, which strict clients (e.g. Zod v4's
	// `fromJSONSchema`) refuse to resolve — they only follow refs into `$defs` —
	// leaving the tool's arguments unvalidated client-side.
	it('inlines a schema instance that is reused across the shape instead of emitting a $ref', () => {
		const sharedPosition = z.array(z.number()).length(2).describe('Canvas [x, y].');
		const reusing = shapeToStandardSchema({
			node: z.object({ position: sharedPosition.optional() }).optional(),
			position: sharedPosition.optional().describe('For setNodePosition.'),
		});

		const json = reusing['~standard'].jsonSchema.input({ target: 'draft-2020-12' });

		expect(JSON.stringify(json)).not.toContain('$ref');
		expect(json.properties).toMatchObject({
			node: {
				type: 'object',
				properties: {
					position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
				},
			},
			// The second occurrence keeps its own description override.
			position: {
				type: 'array',
				items: { type: 'number' },
				minItems: 2,
				maxItems: 2,
				description: 'For setNodePosition.',
			},
		});
	});
});
