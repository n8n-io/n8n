import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const mismatchOutcome = z.enum(['different', 'legacy_ok_quickjs_error', 'legacy_error_quickjs_ok']);

export const EXPRESSIONS_TELEMETRY = defineTelemetryEvents({
	EXPRESSION_ENGINE_SHADOW_RUN_REPORTED: {
		name: 'Expression engine shadow run reported',
		// Experiment cleanup: remove with quickjsExpressionShadow (126_quickjs_expression_shadow).
		description:
			'The editor evaluated a sample of expressions with the QuickJS engine next to the legacy engine, and reported the aggregated comparison. Sent every few minutes while the shadow run has new data, and when the tab is hidden. It never carries expression text or values.',
		properties: z.object({
			init_status: z
				.enum(['ready', 'failed'])
				.describe('Whether the QuickJS shadow engine started'),
			init_duration_ms: z.number().describe('Time to load and start the QuickJS shadow engine'),
			sample_rate: z.number().describe('One in this many legacy evaluations also runs in QuickJS'),
			timeout_ms: z.number().describe('QuickJS timeout for one shadow evaluation'),
			evaluations: z
				.number()
				.describe(
					'Expressions compared in this report; repeated evaluations of one expression count once',
				),
			same: z.number(),
			different: z.number(),
			unchecked: z
				.number()
				.describe(
					'Both engines succeeded, but the values were not compared: the expression is non-deterministic or the value is too large',
				),
			legacy_ok_quickjs_error: z.number(),
			legacy_error_quickjs_ok: z.number(),
			both_error: z.number(),
			quickjs_timeouts: z
				.number()
				.describe(
					'Compared expressions where QuickJS hit its timeout, also counted in their outcome',
				),
			latency_bucket_bounds_ms: z
				.array(z.number())
				.describe('Upper bounds of the latency buckets; the last bucket has no upper bound'),
			legacy_latency_buckets: z.array(z.number()),
			quickjs_latency_buckets: z.array(z.number()),
			mismatches: z
				.array(
					z.object({
						outcome: mismatchOutcome,
						skeleton: z.string().describe('The expression without field names, strings or numbers'),
						legacy_type: z.string(),
						quickjs_type: z.string(),
						error_class: z.string().optional(),
						count: z.number(),
					}),
				)
				.describe('Distinct mismatch shapes, capped per report'),
		}),
	},
});
