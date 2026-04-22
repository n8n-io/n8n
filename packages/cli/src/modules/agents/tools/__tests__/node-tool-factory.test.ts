import type { JSONSchema7 } from 'json-schema';

import type { EphemeralNodeExecutor } from '@/node-execution';

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
});

describe('normalizeToObjectSchema', () => {
	// Anthropic's tool `input_schema` must be a top-level `{ type: "object" }`.
	// `zodToJsonSchema()` emits other roots for unions, intersections, arrays,
	// and primitive types — normalization guards against that.

	it('passes through a valid object schema', () => {
		const input: JSONSchema7 = {
			type: 'object',
			properties: { a: { type: 'string' } },
			required: ['a'],
		};
		expect(normalizeToObjectSchema(input)).toBe(input);
	});

	it('falls back to an empty object for top-level anyOf (z.union output)', () => {
		const input: JSONSchema7 = {
			anyOf: [
				{ type: 'object', properties: { a: { type: 'string' } } },
				{ type: 'object', properties: { b: { type: 'number' } } },
			],
		};
		expect(normalizeToObjectSchema(input)).toEqual({ type: 'object', properties: {} });
	});

	it('falls back to an empty object for top-level oneOf', () => {
		const input: JSONSchema7 = {
			oneOf: [{ type: 'string' }, { type: 'number' }],
		};
		expect(normalizeToObjectSchema(input)).toEqual({ type: 'object', properties: {} });
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

	it('falls back to an empty object for allOf with no object members', () => {
		const input: JSONSchema7 = {
			allOf: [{ type: 'string' }, { type: 'number' }],
		};
		expect(normalizeToObjectSchema(input)).toEqual({ type: 'object', properties: {} });
	});

	it('falls back to an empty object for a top-level array schema', () => {
		const input: JSONSchema7 = { type: 'array', items: { type: 'string' } };
		expect(normalizeToObjectSchema(input)).toEqual({ type: 'object', properties: {} });
	});

	it('falls back to an empty object for a top-level primitive schema', () => {
		const input: JSONSchema7 = { type: 'string' };
		expect(normalizeToObjectSchema(input)).toEqual({ type: 'object', properties: {} });
	});
});
