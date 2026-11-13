import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const mismatchOutcome = z.enum(['different', 'legacy_ok_quickjs_error', 'legacy_error_quickjs_ok']);

export const EXPRESSIONS_TELEMETRY = defineTelemetryEvents({
	EXPRESSION_ENGINE_SHADOW_RUN_REPORTED: {
		name: 'Expression engine shadow run reported',
		// Experiment cleanup: remove with quickjsExpressionShadow (126_quickjs_expression_shadow).
		description:
			'The editor evaluated a sample of expressions with the QuickJS engine next to the legacy engine, and reported the aggregated comparison. Sent every few minutes while the shadow run has new data, and when the tab is hidden. It never carries expression text or values.',
		// The `quickjs_fe_` prefix keeps these generic names apart in the PostHog property list.
		properties: z.object({
			quickjs_fe_init_status: z
				.enum(['ready', 'failed'])
				.describe('Whether the QuickJS shadow engine started'),
			quickjs_fe_startup_report: z
				.boolean()
				.describe(
					'True for the one report that each start sends when the engine is ready or failed. It has no evaluations. Use it to count each start once',
				),
			quickjs_fe_init_duration_ms: z
				.number()
				.describe(
					'Time to finish loading and start the QuickJS shadow engine. Excludes earlier preload work',
				),
			quickjs_fe_start_variant: z
				.enum(['boot', 'idle', 'boot_only'])
				.optional()
				.meta({ deprecated: true })
				.describe(
					'Historical start variant. New reports omit this property because the shadow engine always starts during the editor boot',
				),
			quickjs_fe_idle_wait_ms: z
				.number()
				.optional()
				.meta({ deprecated: true })
				.describe(
					'Historical idle wait duration. New reports omit this property because the shadow engine no longer waits for idle time',
				),
			quickjs_fe_bundle_import_ms: z
				.number()
				.optional()
				.describe(
					'Remaining time to import the runtime bundle after any preload. Not set when the start failed before it',
				),
			quickjs_fe_wasm_ready_ms: z
				.number()
				.optional()
				.describe(
					'Remaining time to load and instantiate the WASM module after any preload. Measured after the bundle import',
				),
			quickjs_fe_bridge_ready_ms: z
				.number()
				.optional()
				.describe('Time to create the runtime and load the bundle into it, after the WASM load'),
			quickjs_fe_startup_visible: z
				.boolean()
				.describe(
					'Whether the tab stayed visible during initialization of the shadow engine. Excludes earlier preload work',
				),
			quickjs_fe_wasm_source: z
				.enum(['cache', 'revalidated', 'network'])
				.optional()
				.describe(
					'Where the browser got the WASM file: its cache, its cache after a check with the server, or the network. Not set when the start did not load the file, or the browser has no size for it',
				),
			quickjs_fe_sample_rate: z
				.number()
				.describe('One in this many legacy evaluations also runs in QuickJS'),
			quickjs_fe_timeout_ms: z.number().describe('QuickJS timeout for one shadow evaluation'),
			quickjs_fe_evaluations: z
				.number()
				.describe(
					'Distinct expressions compared in this report, up to 5000; repeats count once. Runs with missing input are not in it',
				),
			quickjs_fe_same: z.number(),
			quickjs_fe_different: z.number(),
			quickjs_fe_unchecked: z
				.number()
				.describe(
					'Both engines succeeded, but the values were not compared: the expression is non-deterministic or the value is too large',
				),
			quickjs_fe_legacy_ok_quickjs_error: z.number(),
			quickjs_fe_legacy_error_quickjs_ok: z.number(),
			quickjs_fe_both_error: z.number(),
			quickjs_fe_legacy_missing_input: z
				.number()
				.describe(
					'The legacy engine had no input data, because previous or intermediate nodes did not run, and QuickJS returned no value either. Not compared, and not in the mismatch shapes',
				),
			quickjs_fe_quickjs_timeouts: z
				.number()
				.describe(
					'Sampled runs where QuickJS hit its timeout. Every run counts, not once per expression',
				),
			quickjs_fe_latency_bucket_bounds_ms: z
				.array(z.number())
				.describe('Upper bounds of the latency buckets; the last bucket has no upper bound'),
			quickjs_fe_legacy_latency_buckets: z.array(z.number()),
			quickjs_fe_quickjs_latency_buckets: z.array(z.number()),
			quickjs_fe_mismatches: z
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
