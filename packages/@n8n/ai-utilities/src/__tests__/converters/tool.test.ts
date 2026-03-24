import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { fromLcTool, getParametersJsonSchema } from '../../converters/tool';

describe('fromLcTool', () => {
	it('converts StructuredTool (schema + invoke) to N8n function tool', () => {
		const tool = {
			name: 'search',
			description: 'Search the web',
			schema: { type: 'object', properties: { q: { type: 'string' } } },
			invoke: jest.fn(),
		};

		const result = fromLcTool(tool);

		expect(result).toEqual({
			type: 'function',
			name: 'search',
			description: 'Search the web',
			inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
		});
	});

	it('converts DynamicStructuredTool (schema + func) to N8n function tool', () => {
		const tool = {
			name: 'calculator',
			description: 'Do math',
			schema: { type: 'object', properties: { a: { type: 'number' } } },
			func: jest.fn(),
		};

		const result = fromLcTool(tool);

		expect(result).toEqual({
			type: 'function',
			name: 'calculator',
			description: 'Do math',
			inputSchema: { type: 'object', properties: { a: { type: 'number' } } },
		});
	});

	it('converts tool with name and schema (no invoke/func) to N8n function tool', () => {
		const tool = {
			name: 'lookup',
			description: 'Look up data',
			schema: { type: 'object' },
		};

		const result = fromLcTool(tool);

		expect(result).toEqual({
			type: 'function',
			name: 'lookup',
			description: 'Look up data',
			inputSchema: { type: 'object' },
		});
	});

	it('converts FunctionDefinition (function + type === "function") to N8n function tool', () => {
		const parameters: JSONSchema7 = {
			type: 'object',
			properties: { query: { type: 'string' } },
			required: ['query'],
		};
		const tool = {
			type: 'function' as const,
			function: {
				name: 'get_weather',
				description: 'Get weather for a location',
				parameters,
			},
		};

		const result = fromLcTool(tool);

		expect(result).toEqual({
			type: 'function',
			name: 'get_weather',
			description: 'Get weather for a location',
			inputSchema: parameters,
		});
	});

	it('throws when tool format is unrecognized', () => {
		const tool = { unknown: 'shape' };

		expect(() => fromLcTool(tool)).toThrow(
			'Unable to convert tool to N8nTool: {"unknown":"shape"}',
		);
	});

	it('throws when tool is empty object', () => {
		expect(() => fromLcTool({})).toThrow('Unable to convert tool to N8nTool');
	});
});

describe('getParametersJsonSchema', () => {
	it('returns schema as-is when inputSchema is plain JSONSchema7', () => {
		const schema: JSONSchema7 = {
			type: 'object',
			properties: { id: { type: 'string' } },
		};
		const tool = {
			type: 'function' as const,
			name: 'test',
			inputSchema: schema,
		};

		const result = getParametersJsonSchema(tool);

		expect(result).toBe(schema);
		expect(result).toEqual({
			type: 'object',
			properties: { id: { type: 'string' } },
		});
	});

	it('returns schema.toJSONSchema() when ZodSchema has toJSONSchema method', () => {
		const jsonSchema: JSONSchema7 = { type: 'object', properties: {} };
		const zodSchema = z.object({ x: z.string() });
		(zodSchema as { toJSONSchema?: () => JSONSchema7 }).toJSONSchema = jest
			.fn()
			.mockReturnValue(jsonSchema);
		const tool = {
			type: 'function' as const,
			name: 'test',
			inputSchema: zodSchema,
		};

		const result = getParametersJsonSchema(tool);

		expect(result).toBe(jsonSchema);
		expect((zodSchema as unknown as { toJSONSchema: jest.Mock }).toJSONSchema).toHaveBeenCalled();
	});

	it('returns zodToJsonSchema(schema) when ZodSchema has no toJSONSchema', () => {
		const zodSchema = z.object({ name: z.string() });
		const tool = {
			type: 'function' as const,
			name: 'test',
			inputSchema: zodSchema,
		};

		const result = getParametersJsonSchema(tool);

		expect(result).toEqual(
			expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					name: expect.objectContaining({ type: 'string' }),
				}),
			}),
		);
	});
});
