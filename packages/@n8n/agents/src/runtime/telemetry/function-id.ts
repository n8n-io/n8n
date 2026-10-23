/** Names the caller of a model request, so a gateway can attribute it without tracing. */
export const X_N8N_FUNCTION_ID_HEADER = 'x-n8n-function-id';

/**
 * Per-call AI SDK `headers` for a runtime with an explicit `functionId`. A task
 * suffix names a side call, as telemetry does (`<functionId>.memory-observer`).
 * Without an explicit `functionId` no header is sent: agent names are user content.
 */
export function buildFunctionIdHeaders(
	functionId: string | undefined,
	suffix?: string,
): { headers?: Record<string, string> } {
	if (!functionId) return {};
	return {
		headers: { [X_N8N_FUNCTION_ID_HEADER]: suffix ? `${functionId}.${suffix}` : functionId },
	};
}
