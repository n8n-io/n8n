import { z } from 'zod';

import { Config, Env } from '../decorators';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.record(z.string(), jsonValueSchema),
		z.array(jsonValueSchema),
	]),
);

const flagValueSchema = z.union([z.string(), z.boolean()]);

const flagOverrideSchema = z.union([
	flagValueSchema,
	z
		.object({
			value: flagValueSchema,
			payload: jsonValueSchema.optional(),
		})
		.strict(),
]);

const flagOverridesSchema = z
	.string()
	.transform((value, ctx): unknown => {
		try {
			return JSON.parse(value);
		} catch {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be valid JSON' });
			return z.NEVER;
		}
	})
	.pipe(z.record(z.string(), flagOverrideSchema));

type FlagOverridesSchema = z.infer<typeof flagOverridesSchema>;

@Config
export class FeatureFlagConfig {
	/**
	 * JSON object that maps feature flag names to override values. Use a string
	 * or boolean to override only the flag value. Use `{ value, payload }` to
	 * override the value and payload together.
	 *
	 * An override without a payload removes the provider payload. A null payload
	 * also removes the provider payload.
	 *
	 * Invalid JSON or invalid override data leaves all flags untouched.
	 *
	 * @example '{"042_some_experiment":{"value":"variant","payload":{"url":"https://example.com"}},"043_other_feature":false}'
	 */
	@Env('N8N_FEATURE_FLAG_OVERRIDES', flagOverridesSchema)
	override: FlagOverridesSchema = {};
}
