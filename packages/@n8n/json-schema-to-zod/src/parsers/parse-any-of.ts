import { z } from 'zod';

import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, JsonSchema, Refs } from '../types';

export const parseAnyOf = (jsonSchema: JsonSchemaObject & { anyOf: JsonSchema[] }, refs: Refs) => {
	return jsonSchema.anyOf.length
		? jsonSchema.anyOf.length === 1
			? parseSchema(jsonSchema.anyOf[0], {
					...refs,
					path: [...refs.path, 'anyOf', 0],
				})
			: z.union(
					jsonSchema.anyOf.map((schema, i) =>
						parseSchema(schema, { ...refs, path: [...refs.path, 'anyOf', i] }),
					) as [z.ZodTypeAny, z.ZodTypeAny],
				)
		: z.any();
};
