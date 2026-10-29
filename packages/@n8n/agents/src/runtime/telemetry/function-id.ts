/** Names the caller of a model request, so a gateway can attribute it without tracing. */
export const X_N8N_FUNCTION_ID_HEADER = 'x-n8n-function-id';

/** Fetch rejects a header value outside Latin-1, so a caller id keeps to `[A-Za-z0-9._-]`. */
export function assertFunctionId(id: string): void {
	if (!/^[A-Za-z0-9._-]+$/.test(id)) {
		throw new Error(`functionId must match [A-Za-z0-9._-]+, got ${JSON.stringify(id)}`);
	}
}

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
	const value = suffix ? `${functionId}.${suffix}` : functionId;
	assertFunctionId(value);
	return { headers: { [X_N8N_FUNCTION_ID_HEADER]: value } };
}
