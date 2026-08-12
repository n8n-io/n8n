import { z } from 'zod';

import { Config, Env } from '../decorators';

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
	.pipe(z.record(z.string(), z.union([z.string(), z.boolean()])));

@Config
export class FeatureFlagConfig {
	/**
	 * JSON object mapping feature flag names to override values, applied on top
	 * of provider-resolved flags. Boolean flags take `true`/`false`; multivariate
	 * flags take their variant string.
	 *
	 * @example '{"105_instance_ai_one_off_tasks":"variant","some_flag":true}'
	 */
	@Env('N8N_FEATURE_FLAG_OVERRIDES', flagOverridesSchema)
	override: Record<string, string | boolean> = {};
}
