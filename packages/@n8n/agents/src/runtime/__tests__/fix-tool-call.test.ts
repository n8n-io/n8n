import type { InvalidToolInputError, NoSuchToolError } from 'ai';
import { z } from 'zod';

import type { BuiltTool } from '../../types';
import { fixToolCall } from '../fix-tool-call';

function makeTool(overrides: Partial<BuiltTool> = {}): BuiltTool {
	return {
		name: 'get_environment',
		description: 'test tool',
		...overrides,
	};
}

function makeToolCall(
	overrides: {
		toolCallId?: string;
		toolName?: string;
		input?: unknown;
		providerExecuted?: boolean;
		dynamic?: boolean;
	} = {},
) {
	return {
		toolCallId: 'tc-1',
		toolName: 'get_environment',
		input: null,
		providerExecuted: false,
		dynamic: false,
		...overrides,
	};
}

function makeInvalidToolInputError() {
	return { name: 'AI_InvalidToolInputError' } as unknown as InvalidToolInputError;
}

function makeNoSuchToolError() {
	return { name: 'AI_NoSuchToolError' } as unknown as NoSuchToolError;
}

// ---------------------------------------------------------------------------
// fixToolCall
// ---------------------------------------------------------------------------

describe('fixToolCall — early-exit guards', () => {
	it('returns null when the tool is not found in toolMap', async () => {
		const result = await fixToolCall(
			{ toolCall: makeToolCall(), error: makeInvalidToolInputError() },
			new Map(),
		);
		expect(result).toBeNull();
	});

	it('returns null when error is not AI_InvalidToolInputError', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall(), error: makeNoSuchToolError() },
			toolMap,
		);
		expect(result).toBeNull();
	});

	it('returns null when toolCall.providerExecuted is true', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{
				toolCall: makeToolCall({ providerExecuted: true }),
				error: makeInvalidToolInputError(),
			},
			toolMap,
		);
		expect(result).toBeNull();
	});
});

describe('fixToolCall — schema / input guards', () => {
	it('returns null when tool schema is a non-empty Zod object', async () => {
		const toolMap = new Map([
			['get_environment', makeTool({ inputSchema: z.object({ q: z.string() }) })],
		]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: null }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toBeNull();
	});

	it('returns null when tool schema is a non-object Zod type', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.string() })]]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: null }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toBeNull();
	});

	it('returns null when tool schema is a plain JSON Schema object (not Zod)', async () => {
		const toolMap = new Map([
			['get_environment', makeTool({ inputSchema: { type: 'object', properties: {} } })],
		]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: null }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toBeNull();
	});

	it('returns null when input is not null and not the string "null"', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: '{}' }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toBeNull();
	});

	it('returns null when input is an empty object (not null)', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: {} }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toBeNull();
	});
});

describe('fixToolCall — common tool schemas that must NOT trigger repair', () => {
	// Each entry: [label, schema]. All are called with null input + InvalidToolInputError
	// so the ONLY reason repair is skipped is that the schema is not an empty Zod object.
	it.each([
		// Typical single-field tools
		['z.object with a required string field', z.object({ query: z.string() })],
		[
			'z.object with multiple typed fields',
			z.object({ url: z.string(), method: z.enum(['GET', 'POST']) }),
		],
		['z.object with an optional field', z.object({ limit: z.number().optional() })],
		['z.object with an array field', z.object({ items: z.array(z.string()) })],
		['z.object with a nested object', z.object({ filters: z.object({ active: z.boolean() }) })],
		['z.object with a default value', z.object({ page: z.number().default(1) })],
		// Non-object Zod roots
		['z.string() root schema', z.string()],
		['z.record() root schema', z.record(z.string(), z.unknown())],
		// Wrapping an empty object in another Zod type changes the typeName
		['z.object({}).optional()', z.object({}).optional()],
		['z.object({}).nullable()', z.object({}).nullable()],
		// Raw JSON Schema (not a Zod type at all)
		[
			'JSON Schema object with properties',
			{ type: 'object', properties: { q: { type: 'string' } } },
		],
		[
			'JSON Schema object with required fields',
			{ type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
		],
	])('returns null for %s', async (_, schema) => {
		const toolMap = new Map([
			['get_environment', makeTool({ inputSchema: schema as BuiltTool['inputSchema'] })],
		]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: null }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toBeNull();
	});
});

describe('fixToolCall — successful repair', () => {
	it('repairs when tool has z.object({}) schema and input is null', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: null }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toEqual({
			type: 'tool-call',
			toolCallId: 'tc-1',
			toolName: 'get_environment',
			input: '{}',
			providerExecuted: false,
			dynamic: false,
		});
	});

	it('repairs when tool has z.object({}) schema and input is the string "null"', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{ toolCall: makeToolCall({ input: 'null' }), error: makeInvalidToolInputError() },
			toolMap,
		);
		expect(result).toMatchObject({ type: 'tool-call', input: '{}' });
	});

	it('preserves dynamic flag from the original tool call', async () => {
		const toolMap = new Map([['get_environment', makeTool({ inputSchema: z.object({}) })]]);
		const result = await fixToolCall(
			{
				toolCall: makeToolCall({ input: null, dynamic: true }),
				error: makeInvalidToolInputError(),
			},
			toolMap,
		);
		expect(result).toMatchObject({ dynamic: true });
	});
});
