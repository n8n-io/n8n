import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { z } from 'zod/v4';

// zod/v4 in the pinned zod 3.25.x implements Standard Schema validation but not
// `~standard.jsonSchema` (added in zod 4.2). Grafting the converter on satisfies the
// SDK's schema-object contract without bumping zod.
export function asMcpSchema<S extends z.ZodType>(
	schema: S,
): StandardSchemaWithJSON<z.input<S>, z.output<S>> {
	const jsonSchema = (io: 'input' | 'output') =>
		z.toJSONSchema(schema, { io }) as Record<string, unknown>;
	return {
		// eslint-disable-next-line @typescript-eslint/naming-convention -- Standard Schema spec key
		'~standard': {
			...schema['~standard'],
			jsonSchema: { input: () => jsonSchema('input'), output: () => jsonSchema('output') },
		},
	};
}
