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

type FlagOverridesSchema = z.infer<typeof flagOverridesSchema>;

@Config
export class FeatureFlagConfig {
	/**
	 * JSON object mapping feature flag names to override values, applied on top
	 * of the values resolved from the feature-flag provider. Boolean flags take
	 * `true`/`false`; multivariate flags take their variant string. Because an
	 * override sets the value outright, `false` also works as a kill switch for
	 * a flag the provider enabled.
	 *
	 * Invalid JSON, or a value that is neither a string nor a boolean, is
	 * rejected with a warning and leaves all flags untouched.
	 *
	 * @example '{"042_some_experiment":"variant","043_other_feature":false}'
	 */
	@Env('N8N_FEATURE_FLAG_OVERRIDES', flagOverridesSchema)
	override: FlagOverridesSchema = {};
}
