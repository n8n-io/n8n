import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { zodToDraft202012 } from '@n8n/ai-utilities/json-schema';
import { z } from 'zod';

// The MCP server is rebuilt on every request, but most tool shapes are
// module-level constants. A cache keyed on the shape object converts each shape
// once per process. The `WeakMap` frees an entry with its shape.
const jsonSchemaCache = new WeakMap<z.ZodRawShape, Record<string, unknown>>();

/**
 * Bridges a classic-zod raw shape to the Standard Schema interface the v2 MCP
 * SDK requires. The SDK only uses `~standard.validate` (argument checking) and
 * `~standard.jsonSchema` (the shape advertised in tools/list); validation stays
 * on the exact zod object we validate with today, so tool semantics don't
 * change.
 */
export function shapeToStandardSchema<Shape extends z.ZodRawShape>(
	shape: Shape,
): StandardSchemaWithJSON<
	z.objectInputType<Shape, z.ZodTypeAny>,
	z.objectOutputType<Shape, z.ZodTypeAny>
> {
	const schema = z.object(shape);

	// The SDK reads the JSON Schema only for `tools/list` and for the tool that a
	// `tools/call` names. Convert on the first read, so that other requests skip it.
	const toJsonSchema = () => {
		const cached = jsonSchemaCache.get(shape);
		if (cached) return cached;

		// `$refStrategy: 'none'` inlines schema instances that are reused across the
		// shape. The default strategy dedupes a reused instance into a `$ref` to an
		// arbitrary `#/properties/...` path, which common client-side validators
		// (e.g. Zod v4's `fromJSONSchema`) refuse to resolve — they only follow refs
		// into `$defs`/`definitions`. Inlining also matches Zod v4's `toJSONSchema`
		// default (`reused: 'inline'`), the migration target for this bridge.
		const jsonSchema = zodToDraft202012(schema, { $refStrategy: 'none' });
		jsonSchemaCache.set(shape, jsonSchema);
		return jsonSchema;
	};

	return {
		'~standard': {
			version: 1,
			vendor: 'n8n-zod-classic',
			validate: (value) => {
				const result = schema.safeParse(value);
				return result.success
					? { value: result.data }
					: {
							issues: result.error.issues.map((issue) => ({
								message: issue.message,
								path: issue.path,
							})),
						};
			},
			jsonSchema: {
				input: toJsonSchema,
				output: toJsonSchema,
			},
		},
	};
}
