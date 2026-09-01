import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { zodToDraft202012 } from '@n8n/ai-utilities/json-schema';
import { z } from 'zod';

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
	const jsonSchema = zodToDraft202012(schema);

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
