import type { JsonValue } from 'n8n-workflow';
import { z } from 'zod';

/**
 * A recursive JSON value: primitives, arrays of JSON values, and string-keyed
 * objects of JSON values. Validates that a value is safely JSON-serializable
 * (no `undefined`, functions, `Date`, `Map`, etc.) at every nesting level.
 *
 * Shared across agent-config and agent-eval schemas so validation cannot
 * diverge between the two surfaces.
 */
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.record(z.string(), jsonValueSchema),
		z.array(jsonValueSchema),
	]),
);
