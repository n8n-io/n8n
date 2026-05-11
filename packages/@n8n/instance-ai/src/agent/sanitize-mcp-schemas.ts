/**
 * Sanitizes MCP tool Zod schemas for Anthropic compatibility.
 *
 * Problem: Chrome DevTools MCP (and potentially other MCP servers) return JSON
 * schemas with `type: ["string", "null"]`. Mastra converts these to
 * `z.union([z.string(), z.null()])`. Anthropic's API rejects `ZodNull` —
 * `@mastra/schema-compat` throws "does not support zod type: ZodNull".
 *
 * Solution: Walk the Zod schema tree and replace ZodNull unions with optional
 * non-null alternatives. For example:
 *   z.union([z.string(), z.null()])  →  z.string().optional()
 *   z.nullable(z.string())           →  z.string().optional()
 */

import type { ToolsInput } from '@mastra/core/agent';
import { z } from 'zod';

export const MCP_SCHEMA_MAX_DEPTH = 32;
export const MCP_SCHEMA_MAX_NODES = 1_000;
export const MCP_SCHEMA_MAX_OBJECT_PROPERTIES = 250;
export const MCP_SCHEMA_MAX_UNION_OPTIONS = 100;

type McpSchemaLimitType =
	| 'depth'
	| 'nodes'
	| 'objectProperties'
	| 'unionOptions'
	| 'unsupportedType';

export class McpSchemaSanitizationError extends Error {
	constructor(
		message: string,
		readonly details: {
			toolName?: string;
			path: string;
			depth: number;
			maxDepth: number;
			limit?: number;
			limitType?: McpSchemaLimitType;
			count?: number;
			zodType?: string;
		},
	) {
		super(message);
		this.name = 'McpSchemaSanitizationError';
	}
}

interface SanitizeBudget {
	nodes: number;
}

interface SanitizeContext {
	strict: boolean;
	toolName?: string;
	path: string;
	depth: number;
	maxDepth: number;
	maxNodes: number;
	maxObjectProperties: number;
	maxUnionOptions: number;
	budget: SanitizeBudget;
}

interface SanitizeZodTypeOptions {
	maxDepth?: number;
	maxNodes?: number;
	maxObjectProperties?: number;
	maxUnionOptions?: number;
	toolName?: string;
	path?: string;
	budget?: SanitizeBudget;
}

interface ValidateJsonSchemaOptions {
	maxDepth?: number;
	maxNodes?: number;
	maxObjectProperties?: number;
	maxUnionOptions?: number;
	toolName?: string;
}

interface JsonSchemaValidationContext {
	toolName?: string;
	maxDepth: number;
	maxNodes: number;
	maxObjectProperties: number;
	maxUnionOptions: number;
	budget: SanitizeBudget;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwJsonSchemaLimitError(
	context: JsonSchemaValidationContext,
	path: string,
	depth: number,
	message: string,
	limitType: McpSchemaLimitType,
	limit: number,
	count?: number,
): never {
	throw new McpSchemaSanitizationError(message, {
		toolName: context.toolName,
		path,
		depth,
		maxDepth: context.maxDepth,
		limit,
		limitType,
		count,
	});
}

function validateJsonSchemaNode(
	value: unknown,
	path: string,
	depth: number,
	context: JsonSchemaValidationContext,
): void {
	if (depth > context.maxDepth) {
		throwJsonSchemaLimitError(
			context,
			path,
			depth,
			`MCP schema exceeds maximum depth of ${context.maxDepth}`,
			'depth',
			context.maxDepth,
			depth,
		);
	}

	context.budget.nodes++;
	if (context.budget.nodes > context.maxNodes) {
		throwJsonSchemaLimitError(
			context,
			path,
			depth,
			`MCP schema exceeds maximum node count of ${context.maxNodes}`,
			'nodes',
			context.maxNodes,
			context.budget.nodes,
		);
	}

	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			validateJsonSchemaNode(item, `${path}[${index}]`, depth + 1, context);
		}
		return;
	}

	if (!isRecord(value)) return;

	const properties = value.properties;
	if (isRecord(properties)) {
		const propertyCount = Object.keys(properties).length;
		if (propertyCount > context.maxObjectProperties) {
			throwJsonSchemaLimitError(
				context,
				`${path}.properties`,
				depth + 1,
				`MCP schema object exceeds maximum property count of ${context.maxObjectProperties}`,
				'objectProperties',
				context.maxObjectProperties,
				propertyCount,
			);
		}
	}

	for (const unionKey of ['anyOf', 'oneOf', 'allOf']) {
		const unionOptions = value[unionKey];
		if (Array.isArray(unionOptions) && unionOptions.length > context.maxUnionOptions) {
			throwJsonSchemaLimitError(
				context,
				`${path}.${unionKey}`,
				depth + 1,
				`MCP schema union exceeds maximum option count of ${context.maxUnionOptions}`,
				'unionOptions',
				context.maxUnionOptions,
				unionOptions.length,
			);
		}
	}

	for (const [key, child] of Object.entries(value)) {
		validateJsonSchemaNode(child, `${path}.${key}`, depth + 1, context);
	}
}

export function assertMcpJsonSchemaWithinLimits(
	schema: unknown,
	options: ValidateJsonSchemaOptions = {},
): void {
	validateJsonSchemaNode(schema, '$.inputSchema', 0, {
		toolName: options.toolName,
		maxDepth: options.maxDepth ?? MCP_SCHEMA_MAX_DEPTH,
		maxNodes: options.maxNodes ?? MCP_SCHEMA_MAX_NODES,
		maxObjectProperties: options.maxObjectProperties ?? MCP_SCHEMA_MAX_OBJECT_PROPERTIES,
		maxUnionOptions: options.maxUnionOptions ?? MCP_SCHEMA_MAX_UNION_OPTIONS,
		budget: { nodes: 0 },
	});
}

/**
 * Recursively walk a Zod schema tree and replace Anthropic-incompatible types.
 *
 * When `strict` is true, throws on description conflicts in discriminated unions
 * instead of merging them. Use strict mode for first-party tool schemas to catch
 * mismatched descriptions at construction time rather than silently degrading
 * the schema the model sees.
 */
export function sanitizeZodType(
	schema: z.ZodTypeAny,
	strict = false,
	options: SanitizeZodTypeOptions = {},
): z.ZodTypeAny {
	return sanitizeZodTypeInner(schema, {
		strict,
		toolName: options.toolName,
		path: options.path ?? '$',
		depth: 0,
		maxDepth: options.maxDepth ?? MCP_SCHEMA_MAX_DEPTH,
		maxNodes: options.maxNodes ?? MCP_SCHEMA_MAX_NODES,
		maxObjectProperties: options.maxObjectProperties ?? MCP_SCHEMA_MAX_OBJECT_PROPERTIES,
		maxUnionOptions: options.maxUnionOptions ?? MCP_SCHEMA_MAX_UNION_OPTIONS,
		budget: options.budget ?? { nodes: 0 },
	});
}

function createLimitError(
	context: SanitizeContext,
	message: string,
	limitType: McpSchemaLimitType,
	limit: number,
	count?: number,
): McpSchemaSanitizationError {
	return new McpSchemaSanitizationError(message, {
		toolName: context.toolName,
		path: context.path,
		depth: context.depth,
		maxDepth: context.maxDepth,
		limit,
		limitType,
		count,
	});
}

function createUnsupportedTypeError(
	context: SanitizeContext,
	schema: z.ZodTypeAny,
): McpSchemaSanitizationError {
	const definition = schema._def as { typeName?: unknown };
	const zodType =
		typeof definition.typeName === 'string' ? definition.typeName : schema.constructor.name;
	return new McpSchemaSanitizationError(`MCP schema contains unsupported Zod type ${zodType}`, {
		toolName: context.toolName,
		path: context.path,
		depth: context.depth,
		maxDepth: context.maxDepth,
		limitType: 'unsupportedType',
		zodType,
	});
}

function isSupportedLeafSchema(schema: z.ZodTypeAny): boolean {
	return (
		schema instanceof z.ZodString ||
		schema instanceof z.ZodNumber ||
		schema instanceof z.ZodBoolean ||
		schema instanceof z.ZodDate ||
		schema instanceof z.ZodAny ||
		schema instanceof z.ZodUnknown ||
		schema instanceof z.ZodLiteral ||
		schema instanceof z.ZodEnum ||
		schema instanceof z.ZodNativeEnum
	);
}

function sanitizeZodTypeInner(schema: z.ZodTypeAny, context: SanitizeContext): z.ZodTypeAny {
	if (context.depth > context.maxDepth) {
		throw createLimitError(
			context,
			`MCP schema exceeds maximum depth of ${context.maxDepth}`,
			'depth',
			context.maxDepth,
			context.depth,
		);
	}
	context.budget.nodes++;
	if (context.budget.nodes > context.maxNodes) {
		throw createLimitError(
			context,
			`MCP schema exceeds maximum node count of ${context.maxNodes}`,
			'nodes',
			context.maxNodes,
			context.budget.nodes,
		);
	}

	const sanitizeChild = (child: z.ZodTypeAny, path: string): z.ZodTypeAny =>
		sanitizeZodTypeInner(child, {
			...context,
			path,
			depth: context.depth + 1,
		});

	// ZodNull → replace with optional undefined (shouldn't appear standalone, but handle it)
	if (schema instanceof z.ZodNull) {
		return z.string().optional();
	}

	// ZodNullable<T> → T.optional()
	if (schema instanceof z.ZodNullable) {
		return sanitizeChild(
			(schema as z.ZodNullable<z.ZodTypeAny>).unwrap(),
			`${context.path}?`,
		).optional();
	}

	// ZodDiscriminatedUnion — flatten to a single z.object
	// (discriminator becomes an enum with per-action descriptions,
	//  variant-specific fields become optional with merged descriptions).
	// Anthropic rejects top-level unions because they produce schemas without type=object.
	if (schema instanceof z.ZodDiscriminatedUnion) {
		const disc = schema as z.ZodDiscriminatedUnion<string, Array<z.ZodObject<z.ZodRawShape>>>;
		const discriminator = disc.discriminator;
		const variants = [...disc.options.values()] as Array<z.ZodObject<z.ZodRawShape>>;
		if (variants.length > context.maxUnionOptions) {
			throw createLimitError(
				context,
				`MCP schema discriminated union exceeds maximum option count of ${context.maxUnionOptions}`,
				'unionOptions',
				context.maxUnionOptions,
				variants.length,
			);
		}

		// Phase 1: Collect metadata from all variants
		const actionMeta: Array<{ value: string; description?: string }> = [];
		const fieldMeta = new Map<
			string,
			Array<{ action: string; description?: string; type: z.ZodTypeAny }>
		>();

		for (const variant of variants) {
			let actionValue = '';

			for (const [key, value] of Object.entries(variant.shape)) {
				if (key === discriminator && value instanceof z.ZodLiteral) {
					actionValue = String(value.value);
					actionMeta.push({ value: actionValue, description: value.description });
				}
			}

			for (const [key, value] of Object.entries(variant.shape)) {
				if (key === discriminator) continue;
				if (!fieldMeta.has(key)) fieldMeta.set(key, []);
				fieldMeta.get(key)!.push({
					action: actionValue,
					description: value.description,
					type: value,
				});
			}
		}
		const mergedPropertyCount = fieldMeta.size + (actionMeta.length > 0 ? 1 : 0);
		if (mergedPropertyCount > context.maxObjectProperties) {
			throw createLimitError(
				context,
				`MCP schema object exceeds maximum property count of ${context.maxObjectProperties}`,
				'objectProperties',
				context.maxObjectProperties,
				mergedPropertyCount,
			);
		}

		// Phase 2: Build the merged shape
		const mergedShape: z.ZodRawShape = {};

		// Build discriminator enum with per-action descriptions
		if (actionMeta.length > 0) {
			const enumValues = actionMeta.map((a) => a.value);
			const actionDescParts = actionMeta.map((a) =>
				a.description ? `"${a.value}": ${a.description}` : `"${a.value}"`,
			);
			mergedShape[discriminator] = z
				.enum(enumValues as [string, ...string[]])
				.describe(actionDescParts.join(' | '));
		}

		// Build each field with properly merged descriptions
		for (const [fieldName, entries] of fieldMeta) {
			const sanitizedField = sanitizeChild(
				entries[0].type,
				`${context.path}.${fieldName}`,
			).optional();

			// Detect enum value conflicts across variants.
			// Only the first variant's type is used (entries[0].type), so differing
			// enum values in other variants would be silently lost.
			if (context.strict && entries.length > 1) {
				const unwrapOptional = (t: z.ZodTypeAny): z.ZodTypeAny =>
					t instanceof z.ZodOptional ? unwrapOptional(t.unwrap() as z.ZodTypeAny) : t;

				const enumEntries = entries.filter((e) => {
					return unwrapOptional(e.type) instanceof z.ZodEnum;
				});
				if (enumEntries.length > 1) {
					const valueSets = enumEntries.map((e) => {
						const raw = unwrapOptional(e.type);
						return (raw as z.ZodEnum<[string, ...string[]]>).options.slice().sort().join(',');
					});
					const uniqueValues = new Set(valueSets);
					if (uniqueValues.size > 1) {
						const conflictDetails = enumEntries
							.map((e) => {
								const raw = unwrapOptional(e.type);
								const vals = (raw as z.ZodEnum<[string, ...string[]]>).options;
								return `  Action "${e.action}": [${vals.join(', ')}]`;
							})
							.join('\n');
						throw new Error(
							`Enum conflict for field "${fieldName}" in discriminated union:\n` +
								`${conflictDetails}\n` +
								'Harmonize enum values across all actions that share this field.',
						);
					}
				}
			}

			const withDesc = entries.filter(
				(e): e is typeof e & { description: string } => !!e.description,
			);
			const uniqueDescs = new Set(withDesc.map((d) => d.description));

			if (uniqueDescs.size > 1) {
				if (context.strict) {
					const conflictDetails = withDesc
						.map((d) => `  Action "${d.action}": "${d.description}"`)
						.join('\n');
					throw new Error(
						`Description conflict for field "${fieldName}" in discriminated union:\n` +
							`${conflictDetails}\n` +
							'Harmonize to a single description across all actions that share this field.',
					);
				}
				// Non-strict: combine with action context for external MCP tools
				const combined = withDesc.map((d) => `For "${d.action}": ${d.description}`).join('. ');
				mergedShape[fieldName] = sanitizedField.describe(combined);
			} else if (entries.length < actionMeta.length) {
				// Field appears in a subset of variants. Annotate with an action hint so
				// the model binds the (now-flattened-optional) field to the right actions
				// and stops cross-mixing fields between sibling actions.
				const actionList = entries.map((e) => `"${e.action}"`).join(', ');
				const baseDesc = withDesc[0]?.description;
				const merged = baseDesc ? `For ${actionList}: ${baseDesc}` : `Only for ${actionList}`;
				mergedShape[fieldName] = sanitizedField.describe(merged);
			} else {
				mergedShape[fieldName] = sanitizedField;
			}
		}

		return z.object(mergedShape);
	}

	// ZodUnion — strip ZodNull members, make result optional if null was present
	if (schema instanceof z.ZodUnion) {
		const options = (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>)
			.options as z.ZodTypeAny[];
		if (options.length > context.maxUnionOptions) {
			throw createLimitError(
				context,
				`MCP schema union exceeds maximum option count of ${context.maxUnionOptions}`,
				'unionOptions',
				context.maxUnionOptions,
				options.length,
			);
		}
		const nonNull = options.filter((o) => !(o instanceof z.ZodNull));
		const hadNull = nonNull.length < options.length;
		const sanitized = nonNull.map((o, index) =>
			sanitizeChild(o, `${context.path}.union[${index}]`),
		);

		if (sanitized.length === 0) {
			// All options were null — degenerate case
			return z.string().optional();
		}
		if (sanitized.length === 1) {
			return hadNull ? sanitized[0].optional() : sanitized[0];
		}
		const union = z.union(sanitized as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
		return hadNull ? union.optional() : union;
	}

	// ZodObject — recurse into shape
	if (schema instanceof z.ZodObject) {
		const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
		const entries = Object.entries(shape);
		if (entries.length > context.maxObjectProperties) {
			throw createLimitError(
				context,
				`MCP schema object exceeds maximum property count of ${context.maxObjectProperties}`,
				'objectProperties',
				context.maxObjectProperties,
				entries.length,
			);
		}
		const newShape: z.ZodRawShape = {};
		for (const [key, value] of entries) {
			newShape[key] = sanitizeChild(value, `${context.path}.${key}`);
		}
		return z.object(newShape);
	}

	// ZodLazy - resolve during sanitization so limits and null-stripping still apply
	if (schema instanceof z.ZodLazy) {
		return sanitizeChild((schema as z.ZodLazy<z.ZodTypeAny>).schema, `${context.path}.lazy`);
	}

	// ZodOptional — recurse into inner
	if (schema instanceof z.ZodOptional) {
		return sanitizeChild(
			(schema as z.ZodOptional<z.ZodTypeAny>).unwrap(),
			`${context.path}?`,
		).optional();
	}

	// ZodArray — recurse into element
	if (schema instanceof z.ZodArray) {
		return z.array(
			sanitizeChild((schema as z.ZodArray<z.ZodTypeAny>).element, `${context.path}[]`),
		);
	}

	// ZodDefault — recurse into inner
	if (schema instanceof z.ZodDefault) {
		const inner = (schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType;
		return sanitizeChild(inner, `${context.path}.default`).default(
			(schema as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue(),
		);
	}

	// ZodRecord — recurse into value type
	if (schema instanceof z.ZodRecord) {
		return z.record(
			sanitizeChild(
				(schema as z.ZodRecord<z.ZodString, z.ZodTypeAny>).valueSchema,
				`${context.path}.*`,
			),
		);
	}

	// ZodEffects - recurse into the source type. Effects are runtime behavior,
	// but the provider only needs a safe JSON-compatible schema.
	if (schema instanceof z.ZodEffects) {
		return sanitizeChild(
			(schema as z.ZodEffects<z.ZodTypeAny>).innerType(),
			`${context.path}.effect`,
		);
	}

	// ZodPipeline - recurse into both schemas so nested unsupported types cannot hide
	if (schema instanceof z.ZodPipeline) {
		const pipeline = schema as z.ZodPipeline<z.ZodTypeAny, z.ZodTypeAny>;
		return z.pipeline(
			sanitizeChild(pipeline._def.in, `${context.path}.pipeline.in`),
			sanitizeChild(pipeline._def.out, `${context.path}.pipeline.out`),
		);
	}

	// ZodReadonly / ZodBranded / ZodCatch - recurse into the inner type. The wrappers
	// do not add useful provider-schema information, so preserving the safe inner
	// schema is preferable to letting nested unsupported types slip through.
	if (schema instanceof z.ZodReadonly) {
		return sanitizeChild(
			(schema as z.ZodReadonly<z.ZodTypeAny>).unwrap(),
			`${context.path}.readonly`,
		);
	}
	if (schema instanceof z.ZodBranded) {
		return sanitizeChild(
			(schema as z.ZodBranded<z.ZodTypeAny, string>).unwrap(),
			`${context.path}.brand`,
		);
	}
	if (schema instanceof z.ZodCatch) {
		return sanitizeChild(
			(schema as z.ZodCatch<z.ZodTypeAny>).removeCatch(),
			`${context.path}.catch`,
		);
	}

	if (
		schema instanceof z.ZodMap ||
		schema instanceof z.ZodSet ||
		schema instanceof z.ZodPromise ||
		schema instanceof z.ZodFunction ||
		schema instanceof z.ZodIntersection ||
		schema instanceof z.ZodTuple ||
		schema instanceof z.ZodNaN ||
		schema instanceof z.ZodBigInt ||
		schema instanceof z.ZodUndefined ||
		schema instanceof z.ZodNever ||
		schema instanceof z.ZodVoid ||
		schema instanceof z.ZodSymbol
	) {
		throw createUnsupportedTypeError(context, schema);
	}

	// Leaf types (string, number, boolean, enum, literal, etc.) - pass through.
	if (isSupportedLeafSchema(schema)) return schema;

	throw createUnsupportedTypeError(context, schema);
}

/**
 * Ensure a tool's top-level inputSchema produces `type: "object"` in JSON Schema.
 * Anthropic requires all tool input_schema to have `type: "object"` at the root.
 * If the sanitized schema isn't an object type, fall back to z.record(z.unknown())
 * which accepts any object — same fallback used when schema conversion fails.
 */
export function ensureTopLevelObject(schema: z.ZodTypeAny): z.ZodTypeAny {
	if (schema instanceof z.ZodObject || schema instanceof z.ZodRecord) {
		return schema;
	}
	// Fallback: accept any object rather than sending a non-object schema that
	// Anthropic would reject with "input_schema.type: Field required"
	return z.record(z.unknown());
}

/**
 * Sanitize a single Zod input schema for Anthropic compatibility.
 * Must be called BEFORE passing to `createTool()`, because Mastra captures
 * the schema in a closure at construction time — post-creation mutation
 * does not affect the JSON Schema sent to the API.
 *
 * Uses strict mode: throws on description conflicts in discriminated unions
 * to prevent silently degraded schemas. Harmonize field descriptions at the
 * source instead of relying on runtime merging.
 *
 * Preserves the original TypeScript type via the generic parameter so that
 * `z.infer<typeof sanitizedSchema>` still produces the discriminated union type.
 */
export function sanitizeInputSchema<T extends z.ZodTypeAny>(schema: T): T {
	return ensureTopLevelObject(sanitizeZodType(schema, true)) as T;
}

/**
 * Sanitize all MCP tool schemas in-place for Anthropic compatibility.
 * Mutates the tool objects' inputSchema and outputSchema properties.
 *
 * Uses non-strict mode (no build-time errors on conflicts) because external
 * MCP tools are third-party and we can't enforce description harmonization.
 * In practice, external MCP tools come from JSON Schema → Zod conversion
 * and rarely produce ZodDiscriminatedUnion, so the flattening path is
 * unlikely to be hit. If it is, conflicting descriptions are merged with
 * action context (e.g. 'For "create": ... For "delete": ...') rather than
 * throwing.
 */
export function sanitizeMcpToolSchemas(
	tools: ToolsInput,
	options: {
		maxDepth?: number;
		maxNodes?: number;
		maxObjectProperties?: number;
		maxUnionOptions?: number;
		onError?: (error: McpSchemaSanitizationError) => void;
	} = {},
): ToolsInput {
	for (const [name, tool] of Object.entries(tools)) {
		const t = tool as { inputSchema?: z.ZodTypeAny; outputSchema?: z.ZodTypeAny };
		const budget = { nodes: 0 };
		try {
			if (t.inputSchema) {
				t.inputSchema = ensureTopLevelObject(
					sanitizeZodType(t.inputSchema, false, {
						maxDepth: options.maxDepth,
						maxNodes: options.maxNodes,
						maxObjectProperties: options.maxObjectProperties,
						maxUnionOptions: options.maxUnionOptions,
						toolName: name,
						path: '$.inputSchema',
						budget,
					}),
				);
			}
			if (t.outputSchema) {
				t.outputSchema = sanitizeZodType(t.outputSchema, false, {
					maxDepth: options.maxDepth,
					maxNodes: options.maxNodes,
					maxObjectProperties: options.maxObjectProperties,
					maxUnionOptions: options.maxUnionOptions,
					toolName: name,
					path: '$.outputSchema',
					budget,
				});
			}
		} catch (error) {
			if (error instanceof McpSchemaSanitizationError) {
				delete (tools as Record<string, unknown>)[name];
				options.onError?.(error);
				continue;
			}
			throw error;
		}
	}

	return tools;
}
