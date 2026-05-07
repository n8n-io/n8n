import type { ToolsInput } from '@mastra/core/agent';
import { z } from 'zod';

import {
	McpSchemaSanitizationError,
	sanitizeMcpToolSchemas,
	sanitizeZodType,
} from '../sanitize-mcp-schemas';

function makeTools(
	schemas: Record<string, { input?: z.ZodTypeAny; output?: z.ZodTypeAny }>,
): ToolsInput {
	const tools: Record<string, { inputSchema?: z.ZodTypeAny; outputSchema?: z.ZodTypeAny }> = {};
	for (const [name, { input, output }] of Object.entries(schemas)) {
		tools[name] = {
			...(input ? { inputSchema: input } : {}),
			...(output ? { outputSchema: output } : {}),
		};
	}
	return tools as ToolsInput;
}

describe('sanitizeMcpToolSchemas', () => {
	function makeDeepObject(depth: number): z.ZodTypeAny {
		let schema: z.ZodTypeAny = z.string();
		for (let i = 0; i < depth; i++) {
			schema = z.object({ child: schema });
		}
		return schema;
	}

	function makeWideObject(width: number): z.ZodTypeAny {
		const shape: z.ZodRawShape = {};
		for (let i = 0; i < width; i++) {
			shape[`field${i}`] = z.string();
		}
		return z.object(shape);
	}

	it('should return empty tools input unchanged', () => {
		const tools = {} as ToolsInput;

		const result = sanitizeMcpToolSchemas(tools);

		expect(Object.keys(result)).toHaveLength(0);
	});

	it('should leave a tool with clean schema unchanged', () => {
		const inputSchema = z.object({
			url: z.string(),
			method: z.enum(['GET', 'POST']),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodTypeAny }>).myTool
			.inputSchema;
		// Schema should still accept valid input
		expect(resultSchema.safeParse({ url: 'https://example.com', method: 'GET' }).success).toBe(
			true,
		);
		expect(resultSchema.safeParse({ url: 123 }).success).toBe(false);
	});

	it('should convert z.union([z.string(), z.null()]) to z.string().optional()', () => {
		const inputSchema = z.object({
			name: z.union([z.string(), z.null()]),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.inputSchema;

		// Should accept string values
		expect(resultSchema.safeParse({ name: 'hello' }).success).toBe(true);
		// Should accept undefined (optional)
		expect(resultSchema.safeParse({}).success).toBe(true);
		// Should not accept null (ZodNull was removed)
		expect(resultSchema.safeParse({ name: null }).success).toBe(false);
	});

	it('should convert z.nullable(z.string()) to z.string().optional()', () => {
		const inputSchema = z.object({
			title: z.nullable(z.string()),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.inputSchema;

		expect(resultSchema.safeParse({ title: 'test' }).success).toBe(true);
		expect(resultSchema.safeParse({}).success).toBe(true);
		expect(resultSchema.safeParse({ title: null }).success).toBe(false);
	});

	it('should handle nested objects containing nullable fields', () => {
		const inputSchema = z.object({
			config: z.object({
				timeout: z.union([z.number(), z.null()]),
				retries: z.nullable(z.number()),
				name: z.string(),
			}),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.inputSchema;

		// Valid: all fields provided
		expect(
			resultSchema.safeParse({ config: { timeout: 5000, retries: 3, name: 'test' } }).success,
		).toBe(true);
		// Valid: nullable fields omitted (now optional)
		expect(resultSchema.safeParse({ config: { name: 'test' } }).success).toBe(true);
		// Invalid: null values should be rejected
		expect(
			resultSchema.safeParse({ config: { timeout: null, retries: null, name: 'test' } }).success,
		).toBe(false);
	});

	it('should sanitize outputSchema as well', () => {
		const outputSchema = z.object({
			result: z.union([z.string(), z.null()]),
		});
		const tools = makeTools({ myTool: { output: outputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { outputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.outputSchema;

		expect(resultSchema.safeParse({ result: 'ok' }).success).toBe(true);
		expect(resultSchema.safeParse({}).success).toBe(true);
		expect(resultSchema.safeParse({ result: null }).success).toBe(false);
	});

	it('should handle standalone ZodNull by falling back to z.record', () => {
		const tools = makeTools({ myTool: { input: z.null() } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodTypeAny }>).myTool
			.inputSchema;

		// ZodNull → z.string().optional() (not object) → falls back to z.record(z.unknown())
		expect(resultSchema instanceof z.ZodRecord).toBe(true);
		expect(resultSchema.safeParse({}).success).toBe(true);
	});

	it('should handle union where all members are null (degenerate case)', () => {
		const inputSchema = z.object({
			field: z.union([z.null(), z.null()]),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.inputSchema;

		// Degenerate case: all-null union becomes z.string().optional()
		expect(resultSchema.safeParse({}).success).toBe(true);
		expect(resultSchema.safeParse({ field: 'fallback' }).success).toBe(true);
	});

	it('should preserve non-null union members when stripping nulls', () => {
		const inputSchema = z.object({
			value: z.union([z.string(), z.number(), z.null()]),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.inputSchema;

		// String and number should still be accepted
		expect(resultSchema.safeParse({ value: 'text' }).success).toBe(true);
		expect(resultSchema.safeParse({ value: 42 }).success).toBe(true);
		// Optional because null was removed
		expect(resultSchema.safeParse({}).success).toBe(true);
		// Null itself should be rejected
		expect(resultSchema.safeParse({ value: null }).success).toBe(false);
	});

	it('should handle arrays with nullable element types', () => {
		const inputSchema = z.object({
			items: z.array(z.union([z.string(), z.null()])),
		});
		const tools = makeTools({ myTool: { input: inputSchema } });

		const result = sanitizeMcpToolSchemas(tools);

		const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
			.myTool.inputSchema;

		// Array of optional strings should accept strings
		expect(resultSchema.safeParse({ items: ['a', 'b'] }).success).toBe(true);
		// Undefined elements in array are accepted (element is optional)
		expect(resultSchema.safeParse({ items: [undefined] }).success).toBe(true);
	});

	it('should mutate tools in place and return the same reference', () => {
		const tools = makeTools({
			tool1: { input: z.object({ a: z.nullable(z.string()) }) },
		});

		const result = sanitizeMcpToolSchemas(tools);

		expect(result).toBe(tools);
	});

	describe('ensureTopLevelObject guard', () => {
		it('should leave z.object inputSchema unchanged', () => {
			const tools = makeTools({ myTool: { input: z.object({ a: z.string() }) } });

			const result = sanitizeMcpToolSchemas(tools);
			const resultSchema = (result as Record<string, { inputSchema: z.ZodTypeAny }>).myTool
				.inputSchema;

			expect(resultSchema instanceof z.ZodObject).toBe(true);
			expect(resultSchema.safeParse({ a: 'hello' }).success).toBe(true);
		});

		it('should leave z.record inputSchema unchanged', () => {
			const tools = makeTools({ myTool: { input: z.record(z.unknown()) } });

			const result = sanitizeMcpToolSchemas(tools);
			const resultSchema = (result as Record<string, { inputSchema: z.ZodTypeAny }>).myTool
				.inputSchema;

			expect(resultSchema instanceof z.ZodRecord).toBe(true);
			expect(resultSchema.safeParse({ key: 'value' }).success).toBe(true);
		});

		it('should fall back to z.record for top-level z.union([z.string(), z.number()])', () => {
			const tools = makeTools({ myTool: { input: z.union([z.string(), z.number()]) } });

			const result = sanitizeMcpToolSchemas(tools);
			const resultSchema = (result as Record<string, { inputSchema: z.ZodTypeAny }>).myTool
				.inputSchema;

			// Non-object top-level → falls back to z.record(z.unknown())
			expect(resultSchema instanceof z.ZodRecord).toBe(true);
			expect(resultSchema.safeParse({ key: 'value' }).success).toBe(true);
		});

		it('should fall back to z.record for top-level z.string()', () => {
			const tools = makeTools({ myTool: { input: z.string() } });

			const result = sanitizeMcpToolSchemas(tools);
			const resultSchema = (result as Record<string, { inputSchema: z.ZodTypeAny }>).myTool
				.inputSchema;

			expect(resultSchema instanceof z.ZodRecord).toBe(true);
		});

		it('should not apply guard to outputSchema', () => {
			const tools = makeTools({ myTool: { output: z.string() } });

			const result = sanitizeMcpToolSchemas(tools);
			const resultSchema = (result as Record<string, { outputSchema: z.ZodTypeAny }>).myTool
				.outputSchema;

			// outputSchema is NOT guarded — only inputSchema needs type: object
			expect(resultSchema instanceof z.ZodRecord).toBe(false);
		});
	});

	describe('ZodRecord handling', () => {
		it('should recurse into record value type and sanitize nullables', () => {
			const tools = makeTools({
				myTool: { input: z.object({ data: z.record(z.nullable(z.string())) }) },
			});

			const result = sanitizeMcpToolSchemas(tools);
			const resultSchema = (result as Record<string, { inputSchema: z.ZodObject<z.ZodRawShape> }>)
				.myTool.inputSchema;

			expect(resultSchema.safeParse({ data: { key: 'value' } }).success).toBe(true);
			expect(resultSchema.safeParse({ data: { key: undefined } }).success).toBe(true);
			expect(resultSchema.safeParse({ data: { key: null } }).success).toBe(false);
		});
	});

	describe('depth bounding', () => {
		it('should throw a typed error when a schema exceeds the maximum depth', () => {
			expect(() => sanitizeZodType(makeDeepObject(4), false, { maxDepth: 2 })).toThrow(
				McpSchemaSanitizationError,
			);
		});

		it('should remove only the offending MCP tool when one schema is too deep', () => {
			const onError = jest.fn();
			const tools = makeTools({
				validTool: { input: z.object({ name: z.string() }) },
				deepTool: { input: makeDeepObject(4) },
			});

			const result = sanitizeMcpToolSchemas(tools, { maxDepth: 2, onError });

			expect(Object.keys(result)).toEqual(['validTool']);
			expect(onError).toHaveBeenCalledWith(expect.any(McpSchemaSanitizationError));
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls[0]?.[0].details.toolName).toBe('deepTool');
			expect(onErrorCalls[0]?.[0].details.maxDepth).toBe(2);
		});

		it('should bound arrays, records, and unions', () => {
			const tools = makeTools({
				arrayTool: { input: z.array(makeDeepObject(3)) },
				recordTool: { input: z.record(makeDeepObject(3)) },
				unionTool: { input: z.union([makeDeepObject(3), z.null()]) },
			});

			const result = sanitizeMcpToolSchemas(tools, { maxDepth: 2 });

			expect(Object.keys(result)).toEqual([]);
		});

		it('should bound lazy schemas', () => {
			const onError = jest.fn();
			const tools = makeTools({
				lazyTool: { input: z.object({ payload: z.lazy(() => makeWideObject(4)) }) },
			});

			const result = sanitizeMcpToolSchemas(tools, {
				maxObjectProperties: 2,
				onError,
			});

			expect(Object.keys(result)).toEqual([]);
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls[0]?.[0].details.toolName).toBe('lazyTool');
			expect(onErrorCalls[0]?.[0].details.limitType).toBe('objectProperties');
		});

		it('should remove tools containing unsupported tuple or intersection schemas', () => {
			const onError = jest.fn();
			const tools = makeTools({
				tupleTool: { input: z.object({ pair: z.tuple([z.string(), z.null()]) }) },
				intersectionTool: {
					input: z.object({
						payload: z.intersection(z.object({ name: z.string() }), z.object({ id: z.string() })),
					}),
				},
			});

			const result = sanitizeMcpToolSchemas(tools, { onError });

			expect(Object.keys(result)).toEqual([]);
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls.map(([error]) => error.details)).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						toolName: 'tupleTool',
						limitType: 'unsupportedType',
						zodType: 'ZodTuple',
					}),
					expect.objectContaining({
						toolName: 'intersectionTool',
						limitType: 'unsupportedType',
						zodType: 'ZodIntersection',
					}),
				]),
			);
		});

		it('should remove tools containing unsupported wrapper types', () => {
			const onError = jest.fn();
			const tools = makeTools({
				mapTool: { input: z.object({ values: z.map(z.string(), z.string()) }) },
			});

			const result = sanitizeMcpToolSchemas(tools, { onError });

			expect(Object.keys(result)).toEqual([]);
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls[0]?.[0].details.toolName).toBe('mapTool');
			expect(onErrorCalls[0]?.[0].details.limitType).toBe('unsupportedType');
			expect(onErrorCalls[0]?.[0].details.zodType).toBe('ZodMap');
		});

		it('should remove a shallow MCP tool with too many object properties', () => {
			const onError = jest.fn();
			const tools = makeTools({
				wideTool: { input: makeWideObject(4) },
			});

			const result = sanitizeMcpToolSchemas(tools, {
				maxObjectProperties: 2,
				onError,
			});

			expect(Object.keys(result)).toEqual([]);
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls[0]?.[0].details.toolName).toBe('wideTool');
			expect(onErrorCalls[0]?.[0].details.limitType).toBe('objectProperties');
			expect(onErrorCalls[0]?.[0].details.limit).toBe(2);
			expect(onErrorCalls[0]?.[0].details.count).toBe(4);
		});

		it('should remove a shallow MCP tool with too many union options', () => {
			const onError = jest.fn();
			const tools = makeTools({
				unionTool: {
					input: z.object({
						value: z.union([z.literal('a'), z.literal('b'), z.literal('c')]),
					}),
				},
			});

			const result = sanitizeMcpToolSchemas(tools, {
				maxUnionOptions: 2,
				onError,
			});

			expect(Object.keys(result)).toEqual([]);
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls[0]?.[0].details.toolName).toBe('unionTool');
			expect(onErrorCalls[0]?.[0].details.limitType).toBe('unionOptions');
			expect(onErrorCalls[0]?.[0].details.limit).toBe(2);
			expect(onErrorCalls[0]?.[0].details.count).toBe(3);
		});

		it('should remove an MCP tool that exceeds the total schema node budget', () => {
			const onError = jest.fn();
			const tools = makeTools({
				nodeBudgetTool: {
					input: z.object({
						first: z.string(),
						second: z.string(),
					}),
				},
			});

			const result = sanitizeMcpToolSchemas(tools, {
				maxNodes: 2,
				onError,
			});

			expect(Object.keys(result)).toEqual([]);
			const onErrorCalls = onError.mock.calls as Array<[McpSchemaSanitizationError]>;
			expect(onErrorCalls[0]?.[0].details.toolName).toBe('nodeBudgetTool');
			expect(onErrorCalls[0]?.[0].details.limitType).toBe('nodes');
			expect(onErrorCalls[0]?.[0].details.limit).toBe(2);
		});
	});

	describe('strict mode', () => {
		it('should throw on conflicting field descriptions in discriminated unions', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('create'),
					name: z.string().describe('Table name'),
				}),
				z.object({
					action: z.literal('rename'),
					name: z.string().describe('Column name'),
				}),
			]);

			expect(() => sanitizeZodType(union, true)).toThrow(/Description conflict for field "name"/);
		});

		it('should not throw when field descriptions are consistent', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('get'),
					id: z.string().describe('Resource ID'),
				}),
				z.object({
					action: z.literal('delete'),
					id: z.string().describe('Resource ID'),
				}),
			]);

			expect(() => sanitizeZodType(union, true)).not.toThrow();
		});

		it('should merge conflicting descriptions in non-strict mode', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('create'),
					name: z.string().describe('Table name'),
				}),
				z.object({
					action: z.literal('rename'),
					name: z.string().describe('Column name'),
				}),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;
			const nameField = result.shape.name;

			expect(nameField.description).toBe('For "create": Table name. For "rename": Column name');
		});

		it('should throw on conflicting enum values in strict mode', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('create'),
					status: z.enum(['draft', 'published']),
				}),
				z.object({
					action: z.literal('update'),
					status: z.enum(['pending', 'complete']),
				}),
			]);

			expect(() => sanitizeZodType(union, true)).toThrow(/Enum conflict for field "status"/);
		});

		it('should not throw when enum values are identical across variants', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('create'),
					priority: z.enum(['low', 'medium', 'high']),
				}),
				z.object({
					action: z.literal('update'),
					priority: z.enum(['low', 'medium', 'high']),
				}),
			]);

			expect(() => sanitizeZodType(union, true)).not.toThrow();
		});

		it('should not throw on enum conflicts in non-strict mode', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('create'),
					status: z.enum(['draft', 'published']),
				}),
				z.object({
					action: z.literal('update'),
					status: z.enum(['pending', 'complete']),
				}),
			]);

			expect(() => sanitizeZodType(union)).not.toThrow();
		});
	});

	describe('discriminated union flattening', () => {
		it('should generate action enum description from literal descriptions', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('list').describe('List all items'),
				}),
				z.object({
					action: z.literal('get').describe('Get item by ID'),
					id: z.string(),
				}),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;
			const actionField = result.shape.action;

			expect(actionField.description).toBe('"list": List all items | "get": Get item by ID');
		});

		it('should include undescribed actions in the enum without a label', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('list').describe('List all items'),
				}),
				z.object({
					action: z.literal('ping'),
				}),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;
			const actionField = result.shape.action;

			expect(actionField.description).toBe('"list": List all items | "ping"');
		});

		it('should preserve consistent field descriptions across variants', () => {
			const sharedId = z.string().describe('Resource ID');
			const union = z.discriminatedUnion('action', [
				z.object({ action: z.literal('get'), id: sharedId }),
				z.object({ action: z.literal('delete'), id: sharedId }),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;
			const idField = result.shape.id as z.ZodOptional<z.ZodTypeAny>;

			// Original description is preserved (no combined override)
			expect(idField.description).toBe('Resource ID');
			expect(idField.description).not.toContain('For "');
		});

		it('should annotate single-variant fields with an action hint', () => {
			// When a field appears in only ONE variant, flattening makes it optional.
			// Without an action hint the model cross-mixes fields between sibling
			// actions (e.g. sends `nodeIds` when calling `describe`). Prefix with
			// `For "<action>":` so the field is clearly bound to the right action.
			const union = z.discriminatedUnion('action', [
				z.object({ action: z.literal('list') }),
				z.object({
					action: z.literal('type-definition'),
					nodeIds: z.array(z.string()).describe('Node IDs to get definitions for'),
				}),
				z.object({ action: z.literal('describe'), nodeType: z.string().describe('Node type ID') }),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;

			expect(result.shape.nodeIds.description).toBe(
				'For "type-definition": Node IDs to get definitions for',
			);
			expect(result.shape.nodeType.description).toBe('For "describe": Node type ID');
		});

		it('should annotate fields shared by a subset of variants with all their actions', () => {
			// A field appearing in 2 of 3 variants with a consistent description
			// still needs an action hint — the third variant doesn't use it.
			const shared = z.string().describe('Node type ID');
			const union = z.discriminatedUnion('action', [
				z.object({ action: z.literal('list') }),
				z.object({ action: z.literal('describe'), nodeType: shared }),
				z.object({ action: z.literal('explore-resources'), nodeType: shared }),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;

			expect(result.shape.nodeType.description).toBe(
				'For "describe", "explore-resources": Node type ID',
			);
		});

		it('should annotate subset-only fields without a description using "Only for" hint', () => {
			const union = z.discriminatedUnion('action', [
				z.object({ action: z.literal('list') }),
				z.object({ action: z.literal('get'), id: z.string() }),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;

			expect(result.shape.id.description).toBe('Only for "get"');
		});

		it('should combine conflicting field descriptions with action context', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('create'),
					name: z.string().describe('Table name'),
				}),
				z.object({
					action: z.literal('rename'),
					name: z.string().describe('Column name'),
				}),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;
			const nameField = result.shape.name;

			expect(nameField.description).toBe('For "create": Table name. For "rename": Column name');
		});

		it('should make all non-discriminator fields optional', () => {
			const union = z.discriminatedUnion('action', [
				z.object({
					action: z.literal('list'),
					limit: z.number().describe('Max results'),
				}),
				z.object({
					action: z.literal('get'),
					id: z.string().describe('Item ID'),
				}),
			]);

			const result = sanitizeZodType(union) as z.ZodObject<z.ZodRawShape>;

			expect(result.shape.limit).toBeInstanceOf(z.ZodOptional);
			expect(result.shape.id).toBeInstanceOf(z.ZodOptional);
			// action is required (not optional)
			expect(result.shape.action).not.toBeInstanceOf(z.ZodOptional);
		});
	});
});
