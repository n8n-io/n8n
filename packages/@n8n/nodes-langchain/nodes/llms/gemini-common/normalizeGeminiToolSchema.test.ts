import { z } from 'zod';

import { normalizeGeminiToolSchema, wrapGeminiBindTools } from './normalizeGeminiToolSchema';

const unsupportedGeminiSchemaKeys = new Set([
	'$defs',
	'$ref',
	'$schema',
	'additionalProperties',
	'allOf',
	'anyOf',
	'const',
	'default',
	'definitions',
	'exclusiveMaximum',
	'exclusiveMinimum',
	'maximum',
	'minimum',
	'oneOf',
	'pattern',
	'title',
]);

function expectGeminiCompatibleSchema(schema: unknown) {
	if (Array.isArray(schema)) {
		for (const item of schema) expectGeminiCompatibleSchema(item);
		return;
	}

	if (!schema || typeof schema !== 'object') return;

	for (const [key, value] of Object.entries(schema)) {
		expect(unsupportedGeminiSchemaKeys.has(key)).toBe(false);
		expectGeminiCompatibleSchema(value);
	}
}

describe('normalizeGeminiToolSchema', () => {
	it('normalizes nullable type arrays recursively', () => {
		const normalized = normalizeGeminiToolSchema({
			type: 'object',
			additionalProperties: false,
			properties: {
				value: {
					type: ['string', 'null'],
					exclusiveMinimum: 0,
				},
			},
		}) as {
			additionalProperties?: unknown;
			properties: { value: { type: string; nullable: boolean; exclusiveMinimum?: unknown } };
		};

		expect(normalized.additionalProperties).toBeUndefined();
		expect(normalized.properties.value.type).toBe('string');
		expect(normalized.properties.value.nullable).toBe(true);
		expect(normalized.properties.value.exclusiveMinimum).toBeUndefined();
	});

	it('normalizes nullable anyOf and oneOf schemas', () => {
		const normalized = normalizeGeminiToolSchema({
			type: 'object',
			properties: {
				optionalString: {
					anyOf: [{ type: 'string' }, { type: 'null' }],
				},
				optionalNumber: {
					oneOf: [{ type: 'null' }, { type: 'number', exclusiveMaximum: 10 }],
				},
			},
		}) as {
			properties: {
				optionalString: { type: string; nullable: boolean };
				optionalNumber: { type: string; nullable: boolean; exclusiveMaximum?: unknown };
			};
		};

		expect(normalized.properties.optionalString).toEqual({ type: 'string', nullable: true });
		expect(normalized.properties.optionalNumber).toEqual({ type: 'number', nullable: true });
	});

	it('throws on non-null union schemas that Gemini cannot represent', () => {
		expect(() =>
			normalizeGeminiToolSchema({
				type: 'object',
				properties: {
					value: {
						type: 'string',
						description: 'Can be a string or number',
						anyOf: [{ type: 'string' }, { type: 'number', exclusiveMinimum: 0 }],
					},
				},
			}),
		).toThrow('union types must be flattened');
	});

	it('removes unsupported JSON Schema keywords recursively', () => {
		const normalized = normalizeGeminiToolSchema({
			$defs: {},
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'object',
			additionalProperties: false,
			title: 'Search input',
			properties: {
				value: {
					type: 'number',
					default: 1,
					exclusiveMinimum: 0,
					maximum: 100,
					pattern: '^[0-9]+$',
				},
			},
		});

		expectGeminiCompatibleSchema(normalized);
	});

	it('converts const to enum and filters missing required properties', () => {
		const normalized = normalizeGeminiToolSchema({
			type: 'object',
			properties: {
				mode: { const: 'search' },
			},
			required: ['mode', 'missing'],
		}) as {
			properties: { mode: { enum: string[] } };
			required: string[];
		};

		expect(normalized.properties.mode.enum).toEqual(['search']);
		expect(normalized.required).toEqual(['mode']);
	});

	it('throws on empty and null-only enums that Gemini cannot represent', () => {
		expect(() =>
			normalizeGeminiToolSchema({
				type: 'object',
				properties: {
					value: { enum: [null] },
				},
			}),
		).toThrow('Empty or null-only enums cannot be represented');

		expect(() =>
			normalizeGeminiToolSchema({
				type: 'object',
				properties: {
					value: { enum: [] },
				},
			}),
		).toThrow('Empty or null-only enums cannot be represented');
	});

	it('throws on null const values that Gemini cannot represent', () => {
		expect(() =>
			normalizeGeminiToolSchema({
				type: 'object',
				properties: {
					value: { const: null },
				},
			}),
		).toThrow('Empty or null-only enums cannot be represented');
	});
});

describe('wrapGeminiBindTools', () => {
	it('normalizes Zod-backed tool schemas before binding', () => {
		const originalBindTools = vi.fn().mockReturnValue('bound-model');
		const wrappedModel = wrapGeminiBindTools({ bindTools: originalBindTools });
		const tool = {
			name: 'mcp_tool',
			schema: z.object({
				nullableValue: z.string().nullable(),
				positiveValue: z.number().positive().optional(),
			}),
		};

		wrappedModel.bindTools([tool]);

		const boundTool = originalBindTools.mock.calls[0][0][0] as {
			schema: {
				properties: {
					nullableValue: { type: string; nullable: boolean };
					positiveValue: { exclusiveMinimum?: unknown };
				};
			};
		};

		expect(boundTool.schema.properties.nullableValue).toMatchObject({
			type: 'string',
			nullable: true,
		});
		expect(boundTool.schema.properties.positiveValue.exclusiveMinimum).toBeUndefined();
	});

	it('normalizes tool schemas before binding without mutating original tools', () => {
		class TestTool {
			name = 'weather_tool';

			schema = {
				type: 'object',
				properties: {
					temperature: { type: ['number', 'null'], exclusiveMinimum: 0 },
				},
			};

			invoke() {
				return 'ok';
			}
		}

		const originalBindTools = vi.fn().mockReturnValue('bound-model');
		const wrappedModel = wrapGeminiBindTools({ bindTools: originalBindTools });
		const tool = new TestTool();

		wrappedModel.bindTools([tool], { tool_choice: 'auto' });

		const boundTool = originalBindTools.mock.calls[0][0][0] as TestTool;
		expect(boundTool).toBeInstanceOf(TestTool);
		expect(boundTool.invoke()).toBe('ok');
		expect(boundTool.schema.properties.temperature).toEqual({ type: 'number', nullable: true });
		expect(tool.schema.properties.temperature.type).toEqual(['number', 'null']);
	});

	it('normalizes direct function declarations before binding', () => {
		const originalBindTools = vi.fn().mockReturnValue('bound-model');
		const wrappedModel = wrapGeminiBindTools({ bindTools: originalBindTools });

		wrappedModel.bindTools([
			{
				functionDeclarations: [
					{
						name: 'query',
						parameters: {
							type: 'object',
							properties: {
								limit: { type: ['integer', 'null'], exclusiveMaximum: 100 },
							},
						},
					},
				],
			},
		]);

		const boundTool = originalBindTools.mock.calls[0][0][0] as {
			functionDeclarations: Array<{
				parameters: { properties: { limit: { type: string; nullable: boolean } } };
			}>;
		};

		expect(boundTool.functionDeclarations[0].parameters.properties.limit).toEqual({
			type: 'integer',
			nullable: true,
		});
	});
});
