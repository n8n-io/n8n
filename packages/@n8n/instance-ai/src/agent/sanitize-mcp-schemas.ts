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

/**
 * Recursively walk a Zod schema tree and replace Anthropic-incompatible types.
 */
function sanitizeZodType(schema: z.ZodTypeAny): z.ZodTypeAny {
	// ZodNull → replace with optional undefined (shouldn't appear standalone, but handle it)
	if (schema instanceof z.ZodNull) {
		return z.string().optional();
	}

	// ZodNullable<T> → T.optional()
	if (schema instanceof z.ZodNullable) {
		return sanitizeZodType((schema as z.ZodNullable<z.ZodTypeAny>).unwrap()).optional();
	}

	// ZodDiscriminatedUnion — flatten to a single z.object
	// (discriminator becomes an enum, variant-specific fields become optional).
	// Anthropic rejects top-level unions because they produce schemas without type=object.
	if (schema instanceof z.ZodDiscriminatedUnion) {
		const disc = schema as z.ZodDiscriminatedUnion<string, Array<z.ZodObject<z.ZodRawShape>>>;
		const discriminator = disc.discriminator;
		const variants = [...disc.options.values()] as Array<z.ZodObject<z.ZodRawShape>>;

		const mergedShape: z.ZodRawShape = {};
		const discriminatorValues: string[] = [];

		for (const variant of variants) {
			for (const [key, value] of Object.entries(variant.shape)) {
				if (key === discriminator) {
					if (value instanceof z.ZodLiteral) {
						discriminatorValues.push(String(value.value));
					}
				} else if (!(key in mergedShape)) {
					mergedShape[key] = sanitizeZodType(value).optional();
				}
			}
		}

		if (discriminatorValues.length > 0) {
			mergedShape[discriminator] = z.enum(discriminatorValues as [string, ...string[]]);
		}

		return z.object(mergedShape);
	}

	// ZodUnion — strip ZodNull members, make result optional if null was present
	if (schema instanceof z.ZodUnion) {
		const options = (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>)
			.options as z.ZodTypeAny[];
		const nonNull = options.filter((o) => !(o instanceof z.ZodNull));
		const hadNull = nonNull.length < options.length;
		const sanitized = nonNull.map((o) => sanitizeZodType(o));

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
		const newShape: z.ZodRawShape = {};
		for (const [key, value] of Object.entries(shape)) {
			newShape[key] = sanitizeZodType(value);
		}
		return z.object(newShape);
	}

	// ZodOptional — recurse into inner
	if (schema instanceof z.ZodOptional) {
		return sanitizeZodType((schema as z.ZodOptional<z.ZodTypeAny>).unwrap()).optional();
	}

	// ZodArray — recurse into element
	if (schema instanceof z.ZodArray) {
		return z.array(sanitizeZodType((schema as z.ZodArray<z.ZodTypeAny>).element));
	}

	// ZodDefault — recurse into inner
	if (schema instanceof z.ZodDefault) {
		const inner = (schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType;
		return sanitizeZodType(inner).default(
			(schema as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue(),
		);
	}

	// ZodRecord — recurse into value type
	if (schema instanceof z.ZodRecord) {
		return z.record(
			sanitizeZodType((schema as z.ZodRecord<z.ZodString, z.ZodTypeAny>).valueSchema),
		);
	}

	// Leaf types (string, number, boolean, enum, literal, etc.) — pass through
	return schema;
}

/**
 * Ensure a tool's top-level inputSchema produces `type: "object"` in JSON Schema.
 * Anthropic requires all tool input_schema to have `type: "object"` at the root.
 * If the sanitized schema isn't an object type, fall back to z.record(z.unknown())
 * which accepts any object — same fallback used when schema conversion fails.
 */
function ensureTopLevelObject(schema: z.ZodTypeAny): z.ZodTypeAny {
	if (schema instanceof z.ZodObject || schema instanceof z.ZodRecord) {
		return schema;
	}
	// Fallback: accept any object rather than sending a non-object schema that
	// Anthropic would reject with "input_schema.type: Field required"
	return z.record(z.unknown());
}

/**
 * Sanitize all MCP tool schemas in-place for Anthropic compatibility.
 * Mutates the tool objects' inputSchema and outputSchema properties.
 */
export function sanitizeMcpToolSchemas(tools: ToolsInput): ToolsInput {
	for (const tool of Object.values(tools)) {
		const t = tool as { inputSchema?: z.ZodTypeAny; outputSchema?: z.ZodTypeAny };
		if (t.inputSchema) {
			t.inputSchema = ensureTopLevelObject(sanitizeZodType(t.inputSchema));
		}
		if (t.outputSchema) {
			t.outputSchema = sanitizeZodType(t.outputSchema);
		}
	}

	return tools;
}
