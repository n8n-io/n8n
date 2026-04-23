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
 *
 * When `strict` is true, throws on description conflicts in discriminated unions
 * instead of merging them. Use strict mode for first-party tool schemas to catch
 * mismatched descriptions at construction time rather than silently degrading
 * the schema the model sees.
 */
export function sanitizeZodType(schema: z.ZodTypeAny, strict = false): z.ZodTypeAny {
	// ZodNull → replace with optional undefined (shouldn't appear standalone, but handle it)
	if (schema instanceof z.ZodNull) {
		return z.string().optional();
	}

	// ZodNullable<T> → T.optional()
	if (schema instanceof z.ZodNullable) {
		return sanitizeZodType((schema as z.ZodNullable<z.ZodTypeAny>).unwrap(), strict).optional();
	}

	// ZodDiscriminatedUnion — flatten to a single z.object
	// (discriminator becomes an enum with per-action descriptions,
	//  variant-specific fields become optional with merged descriptions).
	// Anthropic rejects top-level unions because they produce schemas without type=object.
	if (schema instanceof z.ZodDiscriminatedUnion) {
		const disc = schema as z.ZodDiscriminatedUnion<string, Array<z.ZodObject<z.ZodRawShape>>>;
		const discriminator = disc.discriminator;
		const variants = [...disc.options.values()] as Array<z.ZodObject<z.ZodRawShape>>;

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
			const sanitizedField = sanitizeZodType(entries[0].type, strict).optional();

			// Detect enum value conflicts across variants.
			// Only the first variant's type is used (entries[0].type), so differing
			// enum values in other variants would be silently lost.
			if (strict && entries.length > 1) {
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
				if (strict) {
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
		const nonNull = options.filter((o) => !(o instanceof z.ZodNull));
		const hadNull = nonNull.length < options.length;
		const sanitized = nonNull.map((o) => sanitizeZodType(o, strict));

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
			newShape[key] = sanitizeZodType(value, strict);
		}
		return z.object(newShape);
	}

	// ZodOptional — recurse into inner
	if (schema instanceof z.ZodOptional) {
		return sanitizeZodType((schema as z.ZodOptional<z.ZodTypeAny>).unwrap(), strict).optional();
	}

	// ZodArray — recurse into element
	if (schema instanceof z.ZodArray) {
		return z.array(sanitizeZodType((schema as z.ZodArray<z.ZodTypeAny>).element, strict));
	}

	// ZodDefault — recurse into inner
	if (schema instanceof z.ZodDefault) {
		const inner = (schema as z.ZodDefault<z.ZodTypeAny>)._def.innerType;
		return sanitizeZodType(inner, strict).default(
			(schema as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue(),
		);
	}

	// ZodRecord — recurse into value type
	if (schema instanceof z.ZodRecord) {
		return z.record(
			sanitizeZodType((schema as z.ZodRecord<z.ZodString, z.ZodTypeAny>).valueSchema, strict),
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
