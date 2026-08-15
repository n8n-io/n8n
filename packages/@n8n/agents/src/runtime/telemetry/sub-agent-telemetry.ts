import type { BuiltTelemetry } from '../../types/telemetry';

/**
 * Derives a delegated sub-agent's telemetry from its parent's live, resolved
 * `BuiltTelemetry` (e.g. `ToolContext.parentTelemetry`), so the child shares
 * the parent's tracer and nests under the parent's delegate-tool-call span
 * instead of starting a separate root trace.
 *
 * Returns undefined when the parent has none — an untraced parent run must
 * not cause its sub-agent to accidentally start its own root trace.
 *
 * `functionId` is cleared so `RuntimeTelemetry.resolve()` re-stamps it with
 * the child runtime's own name instead of keeping the parent's (the parent
 * telemetry object arrives already stamped, since it was resolved for the
 * parent's own run before being handed to the tool).
 */
export function deriveSubAgentTelemetry(
	parentTelemetry: BuiltTelemetry | undefined,
): BuiltTelemetry | undefined {
	if (!parentTelemetry) return undefined;
	return {
		...parentTelemetry,
		functionId: undefined,
		metadata: { ...parentTelemetry.metadata, source: 'sub-agent' },
		rootAnchored: false,
	};
}
