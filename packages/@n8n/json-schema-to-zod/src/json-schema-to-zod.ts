import type { z } from 'zod';

import { parseSchema } from './parsers/parse-schema';
import type { JsonSchemaToZodOptions, JsonSchema } from './types';

export const jsonSchemaToZod = <T extends z.ZodTypeAny = z.ZodTypeAny>(
	schema: JsonSchema,
	options: JsonSchemaToZodOptions = {},
): T => {
	return parseSchema(schema, {
		path: [],
		seen: new Map(),
		...options,
	}) as T;
};
