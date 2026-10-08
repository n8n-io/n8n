/**
 * Trace-only builder metric events. Each event records the outcome of one build
 * or verification step with a `success` flag, so trace queries can count
 * successful and failed steps for each thread and model. `first_response` marks
 * the first text token that the user sees in a turn. The event inherits
 * `thread_id`, `run_id` and `model_id` from its parent span.
 */

import { canEmitTraceOnlyChildRun, emitTraceOnlyChildRun } from './langsmith-tracing';
import type { InstanceAiTraceContext } from '../types';

export const BUILDER_METRIC_TAG = 'builder-metric';

export type BuilderMetricName =
	| 'first_response'
	| 'workflow_build'
	| 'workflow_verification'
	| 'agent_build'
	| 'agent_shown'
	| 'agent_verification'
	| 'agent_test';

// No arrays: LangSmith shows OTel array attributes as raw protobuf in metadata.
type BuilderMetricValue = string | number | boolean | undefined;

export type BuilderMetricFields = { success: boolean } & Record<string, BuilderMetricValue>;

/** Whether a builder metric would be exported. Use it to skip work that only feeds a metric. */
export function canEmitBuilderMetric(tracing: InstanceAiTraceContext | undefined): boolean {
	return canEmitTraceOnlyChildRun(tracing);
}

export async function emitBuilderMetric(
	tracing: InstanceAiTraceContext | undefined,
	name: BuilderMetricName,
	fields: BuilderMetricFields,
): Promise<void> {
	const metadata = Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined),
	);
	try {
		await emitTraceOnlyChildRun(
			tracing,
			{
				name,
				// 'chain' like the other bookkeeping spans: a tool-typed run reads as a
				// real agent tool call in trace UIs.
				runType: 'chain',
				canonicalName: `instance-ai.metric.${name}`,
				tags: [BUILDER_METRIC_TAG],
				metadata,
			},
			{ outputs: metadata },
		);
	} catch {
		// Best-effort: tracing must never fail a build.
	}
}
