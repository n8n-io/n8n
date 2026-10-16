import { z } from 'zod';

import type { JsonObject, JsonValue } from './json';

/** Anything that survives a JSON round trip. */
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(jsonValueSchema),
	]),
);

/** A JSON object. Validates the shape and nothing below it. */
export const jsonObjectSchema: z.ZodType<JsonObject> = z.record(jsonValueSchema);
