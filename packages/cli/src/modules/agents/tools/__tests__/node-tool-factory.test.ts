import { Container } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';

import { normalizeToObjectSchema, resolveNodeTool } from '../node-tool-factory';

// The node-tool-factory imports the DI `Container` to look up NodeTypes inside
// `resolveInputSchema` (for auto-seeding a `{ input: string }` schema on
// native tools). In the unit-test scope the container isn't registered and
// `Container.get(NodeTypes)` throws — the function's own `try/catch` swallows
// that and falls back to the persisted schema, which is exactly what we want
// here. The test doesn't need a real executor either; the handler isn't
// invoked.
const mockCtx = {
	executor: {} as unknown as EphemeralNodeExecutor,
	projectId: 'p1',
};

const baseToolSchema = {
	type: 'node' as const,
	name: 'Google Drive',
	node: {
		nodeType: 'n8n-nodes-base.googleDriveTool',
		nodeTypeVersion: 1,
		nodeParameters: {},
	},
	inputSchema: { type: 'object' as const, properties: {} },
};

afterEach(() => {
	Container.reset();
});

describe('resolveNodeTool → tool name sanitization', () => {
	it('replaces whitespace with underscores so Anthropic accepts the identifier', async () => {
		// Anthropic rejects names that don't match ^[a-zA-Z0-9_-]{1,128}$.
		// "Google Drive" must become "Google_Drive" before the Tool builder sees it.
		const tool = await resolveNodeTool(baseToolSchema, mockCtx);
		expect(tool.name).toBe('Google_Drive');
	});

	it('leaves already-valid names untouched', async () => {
		const tool = await resolveNodeTool({ ...baseToolSchema, name: 'slack_search' }, mockCtx);
		expect(tool.name).toBe('slack_search');
	});

	it('collapses non-alphanumerics and handles edge characters', async () => {
		const tool = await resolveNodeTool({ ...baseToolSchema, name: 'Foo / Bar:  (v2)' }, mockCtx);
		// `nodeNameToToolName` collapses any run of disallowed characters into a single `_`.
		expect(tool.name).toBe('Foo_Bar_v2_');
	});

	it('executes the mirrored tool node when config stores the base node type', async () => {
		const executeInline = jest.fn().mockResolvedValue({ status: 'success', data: [] });
		const getByNameAndVersion = jest.fn().mockReturnValue({
			description: { description: 'HTTP Request Tool' },
		});
		Container.set(NodeTypes, { getByNameAndVersion } as unknown as NodeTypes);

		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: {
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4,
					nodeParameters: {},
				},
			},
			{
				executor: { executeInline } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		await tool.handler!({ url: 'https://example.com' }, {} as never);

		expect(getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.httpRequestTool', 4);
		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({ nodeType: 'n8n-nodes-base.httpRequestTool' }),
		);
	});
});

describe('normalizeToObjectSchema', () => {
	// Anthropic's tool `input_schema` must be a top-level `{ type: "object" }`.
	// `zodToJsonSchema()` emits other roots for unions, intersections, arrays,
	// and primitive types — normalization lifts them into an object root
	// without discarding per-branch field guidance.

	it('passes through a valid object schema', () => {
		const input: JSONSchema7 = {
			type: 'object',
			properties: { a: { type: 'string' } },
			required: ['a'],
		};
		expect(normalizeToObjectSchema(input)).toBe(input);
	});

	it('preserves a top-level anyOf of objects (z.union / z.discriminatedUnion)', () => {
		// The LLM needs each branch's field list to know what to send —
		// collapsing to an empty object would strip that information entirely.
		const memberA: JSONSchema7 = {
			type: 'object',
			properties: { action: { type: 'string', enum: ['create'] }, name: { type: 'string' } },
			required: ['action', 'name'],
		};
		const memberB: JSONSchema7 = {
			type: 'object',
			properties: { action: { type: 'string', enum: ['delete'] }, id: { type: 'string' } },
			required: ['action', 'id'],
		};
		const input: JSONSchema7 = { anyOf: [memberA, memberB] };
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			anyOf: [memberA, memberB],
		});
	});

	it('preserves a top-level oneOf of objects', () => {
		const memberA: JSONSchema7 = { type: 'object', properties: { a: { type: 'string' } } };
		const memberB: JSONSchema7 = { type: 'object', properties: { b: { type: 'number' } } };
		const input: JSONSchema7 = { oneOf: [memberA, memberB] };
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			oneOf: [memberA, memberB],
		});
	});

	it('normalizes nested non-object union members up to object shape', () => {
		// z.union([z.string(), z.object({ foo: z.string() })]) → primitive + object
		// members mixed. The primitive member gets wrapped in { input: <schema> }
		// so it survives as a valid object branch.
		const input: JSONSchema7 = {
			anyOf: [
				{ type: 'string' },
				{ type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
			],
		};
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			anyOf: [
				{
					type: 'object',
					properties: { input: { type: 'string' } },
					required: ['input'],
				},
				{ type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
			],
		});
	});

	it('merges allOf object members (z.intersection output)', () => {
		const input: JSONSchema7 = {
			allOf: [
				{ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
				{ type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
			],
		};
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { a: { type: 'string' }, b: { type: 'number' } },
			required: ['a', 'b'],
		});
	});

	it('deduplicates required fields when merging allOf', () => {
		const input: JSONSchema7 = {
			allOf: [
				{ type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
				{
					type: 'object',
					properties: { id: { type: 'string' }, name: { type: 'string' } },
					required: ['id', 'name'],
				},
			],
		};
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { id: { type: 'string' }, name: { type: 'string' } },
			required: ['id', 'name'],
		});
	});

	it('wraps an allOf with no object members under { input: <schema> }', () => {
		// The merge branch only fires when at least one allOf member is an object.
		// When none are, the whole schema is handed to the default wrap path so
		// the constraint still reaches the LLM.
		const input: JSONSchema7 = {
			allOf: [{ type: 'string' }, { type: 'number' }],
		};
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { input: { allOf: [{ type: 'string' }, { type: 'number' }] } },
			required: ['input'],
		});
	});

	it('wraps a top-level array schema in { input: <schema> }', () => {
		const input: JSONSchema7 = { type: 'array', items: { type: 'string' } };
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { input: { type: 'array', items: { type: 'string' } } },
			required: ['input'],
		});
	});

	it('wraps a top-level primitive schema in { input: <schema> }', () => {
		const input: JSONSchema7 = { type: 'string' };
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { input: { type: 'string' } },
			required: ['input'],
		});
	});

	it('wraps a multi-type root (e.g. { type: ["string", "null"] }) in { input: <schema> }', () => {
		// JSON Schema's `type` is allowed to be an array of type names. zod-to-
		// json-schema emits this for `z.string().nullable()` and similar nullable
		// primitives. The earlier `typeof schema.type === 'string'` check missed
		// this shape and collapsed it to an empty object.
		const input: JSONSchema7 = { type: ['string', 'null'] };
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { input: { type: ['string', 'null'] } },
			required: ['input'],
		});
	});

	it.each([
		['a $ref-only root', { $ref: '#/$defs/Foo' } as JSONSchema7],
		['a const-only root', { const: 'create' } as JSONSchema7],
		['an enum-only root', { enum: ['a', 'b', 'c'] } as JSONSchema7],
		['a not-only root', { not: { type: 'string' } } as JSONSchema7],
		['a bare {} root', {} as JSONSchema7],
	])('wraps %s under { input: <schema> } instead of flattening to empty', (_label, input) => {
		// These roots are valid JSON Schema but carry no `type` field, so a
		// type-narrow fallback would drop every constraint. Wrapping keeps them
		// visible to the LLM while satisfying the top-level-object requirement.
		expect(normalizeToObjectSchema(input)).toEqual({
			type: 'object',
			properties: { input },
			required: ['input'],
		});
	});
});
