import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Bridges a classic-zod raw shape to the Standard Schema interface the v2 MCP
 * SDK requires. The SDK only uses `~standard.validate` (argument checking) and
 * `~standard.jsonSchema` (the shape advertised in tools/list); validation stays
 * on the exact zod object we validate with today, so tool semantics don't
 * change. Removable once the MCP tool schemas move to zod v4, which implements
 * this interface natively.
 */
export function shapeToStandardSchema<Shape extends z.ZodRawShape>(
	shape: Shape,
): StandardSchemaWithJSON<
	z.objectInputType<Shape, z.ZodTypeAny>,
	z.objectOutputType<Shape, z.ZodTypeAny>
> {
	const schema = z.object(shape);
	const jsonSchema: Record<string, unknown> = { ...zodToJsonSchema(schema) };
	// zod-to-json-schema stamps a $schema draft marker; the SDK emits schemas
	// without one, and clients treat its presence inconsistently.
	delete jsonSchema.$schema;

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
				input: () => jsonSchema,
				output: () => jsonSchema,
			},
		},
	};
}
