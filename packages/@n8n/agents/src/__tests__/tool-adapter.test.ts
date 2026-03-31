import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { toAiSdkTools } from '../runtime/tool-adapter';
import type { BuiltTool } from '../types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

const jsonSchemaMock = jest.fn((schema: JSONSchema7) => ({ __jsonSchema: schema }));

jest.mock('ai', () => {
	const actual = jest.requireActual<AiImport>('ai');
	return {
		...actual,
		tool: jest.fn((config: unknown) => config),
		jsonSchema: (schema: JSONSchema7) => jsonSchemaMock(schema),
	};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonSchemaTool(
	inputSchema: JSONSchema7,
	overrides: Partial<BuiltTool> = {},
): BuiltTool {
	return {
		name: 'testTool',
		description: 'A test tool',
		inputSchema,
		...overrides,
	};
}

function makeZodSchemaTool(overrides: Partial<BuiltTool> = {}): BuiltTool {
	return {
		name: 'zodTool',
		description: 'A zod schema tool',
		inputSchema: z.object({ id: z.string() }),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// toAiSdkTools — empty / missing input
// ---------------------------------------------------------------------------

describe('toAiSdkTools — empty / missing input', () => {
	it('returns an empty object when tools is undefined', () => {
		expect(toAiSdkTools(undefined)).toEqual({});
	});

	it('returns an empty object when tools is an empty array', () => {
		expect(toAiSdkTools([])).toEqual({});
	});

	it('skips tools that have no inputSchema', () => {
		const tool: BuiltTool = { name: 'noSchema', description: 'no schema' };
		const result = toAiSdkTools([tool]);
		expect(result).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// toAiSdkTools — Zod schemas
// ---------------------------------------------------------------------------

describe('toAiSdkTools — Zod schemas', () => {
	beforeEach(() => {
		jsonSchemaMock.mockClear();
	});

	it('registers a tool keyed by its name', () => {
		const result = toAiSdkTools([makeZodSchemaTool()]);
		expect(result).toHaveProperty('zodTool');
	});

	it('does NOT call jsonSchema() for Zod schema tools', () => {
		toAiSdkTools([makeZodSchemaTool()]);
		expect(jsonSchemaMock).not.toHaveBeenCalled();
	});

	it('passes the Zod schema directly as inputSchema', () => {
		const zodSchema = z.object({ query: z.string() });
		const result = toAiSdkTools([
			{ name: 'search', description: 'Search', inputSchema: zodSchema },
		]);
		expect((result['search'] as { inputSchema: unknown }).inputSchema).toBe(zodSchema);
	});
});

// ---------------------------------------------------------------------------
// toAiSdkTools — JSON Schema (fixSchema behaviour)
// ---------------------------------------------------------------------------

describe('toAiSdkTools — JSON Schema / fixSchema', () => {
	beforeEach(() => {
		jsonSchemaMock.mockClear();
	});

	it('registers a tool keyed by its name', () => {
		const result = toAiSdkTools([makeJsonSchemaTool({ properties: { id: { type: 'string' } } })]);
		expect(result).toHaveProperty('testTool');
	});

	it('calls jsonSchema() for JSON Schema tools', () => {
		toAiSdkTools([makeJsonSchemaTool({ type: 'object', properties: { id: { type: 'string' } } })]);
		expect(jsonSchemaMock).toHaveBeenCalledTimes(1);
	});

	it('fixSchema: adds type "object" when properties is present but type is absent', () => {
		const rawSchema: JSONSchema7 = {
			properties: { name: { type: 'string' } },
		};
		toAiSdkTools([makeJsonSchemaTool(rawSchema)]);

		expect(jsonSchemaMock).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'object', properties: { name: { type: 'string' } } }),
		);
	});

	it('fixSchema: preserves existing type when type is already set alongside properties', () => {
		const rawSchema: JSONSchema7 = {
			type: 'object',
			properties: { count: { type: 'number' } },
		};
		toAiSdkTools([makeJsonSchemaTool(rawSchema)]);

		expect(jsonSchemaMock).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'object', properties: { count: { type: 'number' } } }),
		);
		// Confirm type was not altered from original
		const received = jsonSchemaMock.mock.calls[0][0];
		expect(received.type).toBe('object');
	});

	it('fixSchema: does not add type when properties is absent', () => {
		const rawSchema: JSONSchema7 = { description: 'no properties' };
		toAiSdkTools([makeJsonSchemaTool(rawSchema)]);

		const received = jsonSchemaMock.mock.calls[0][0];
		expect(received).not.toHaveProperty('type');
	});

	it('fixSchema: does not mutate the original schema object', () => {
		const rawSchema: JSONSchema7 = { properties: { x: { type: 'string' } } };
		toAiSdkTools([makeJsonSchemaTool(rawSchema)]);

		expect(rawSchema).not.toHaveProperty('type');
	});

	it('handles multiple JSON Schema tools independently', () => {
		const schemaWithProps: JSONSchema7 = { properties: { a: { type: 'string' } } };
		const schemaWithType: JSONSchema7 = { type: 'object', properties: { b: { type: 'number' } } };

		const result = toAiSdkTools([
			makeJsonSchemaTool(schemaWithProps, { name: 'toolA' }),
			makeJsonSchemaTool(schemaWithType, { name: 'toolB' }),
		]);

		expect(result).toHaveProperty('toolA');
		expect(result).toHaveProperty('toolB');
		expect(jsonSchemaMock).toHaveBeenCalledTimes(2);

		const firstCall = jsonSchemaMock.mock.calls[0][0];
		const secondCall = jsonSchemaMock.mock.calls[1][0];
		expect(firstCall.type).toBe('object');
		expect(secondCall.type).toBe('object');
	});
});

// ---------------------------------------------------------------------------
// toAiSdkTools — description forwarding
// ---------------------------------------------------------------------------

describe('toAiSdkTools — description forwarding', () => {
	it('forwards the tool description to the AI SDK tool config', () => {
		const zodSchema = z.object({ q: z.string() });
		const result = toAiSdkTools([
			{ name: 'myTool', description: 'Does something useful', inputSchema: zodSchema },
		]);

		expect((result['myTool'] as { description: string }).description).toBe('Does something useful');
	});
});
