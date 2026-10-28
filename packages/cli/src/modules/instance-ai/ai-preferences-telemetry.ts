import type { AiPreferencesAppliedPayload } from '@n8n/api-types';
import type { InferTelemetryProps, TELEMETRY_EVENT } from '@n8n/telemetry';

type PreferencesAppliedProps = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CONTEXT.PREFERENCES_APPLIED_TO_TURN
>;

/**
 * Properties of `Preferences applied to a turn`, or `undefined` when the turn sends no event.
 * Only a turn that put preferences into the conversation counts as use: a turn that applied
 * none, or whose block an earlier turn already carries, reports nothing.
 */
export function buildPreferencesAppliedTelemetry(
	payload: AiPreferencesAppliedPayload,
	turn: {
		userId: string;
		threadId: string;
		runId: string;
		latencyMs: number;
		promptTokens?: number;
	},
): PreferencesAppliedProps | undefined {
	if (!payload.injectedThisTurn || payload.preferences.length === 0) return undefined;

	return {
		user_id: turn.userId,
		thread_id: turn.threadId,
		run_id: turn.runId,
		count: payload.preferences.length,
		preference_ids: payload.preferences.map((p) => p.id),
		scope_types: [...new Set(payload.preferences.map((p) => p.scope))],
		rendered_length: payload.renderedLength,
		surface: 'aia',
		injected_this_turn: true,
		turn_latency_ms: turn.latencyMs,
		...(turn.promptTokens !== undefined ? { turn_token_count: turn.promptTokens } : {}),
	};
}
