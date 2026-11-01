import type { SuspensionInfo } from '@n8n/instance-ai';

/** Root-run outputs for a suspended segment — keep the LangSmith turn readable (AGENT-371). */
export function buildSuspensionTraceOutputs(runId: string, suspension: SuspensionInfo | undefined) {
	const rawMessage = suspension?.suspendPayload.message;
	const message = typeof rawMessage === 'string' && rawMessage ? rawMessage : undefined;
	return {
		status: 'suspended',
		runId,
		...(suspension?.requestId ? { requestId: suspension.requestId } : {}),
		...(suspension?.toolCallId ? { pendingToolCallId: suspension.toolCallId } : {}),
		...(suspension?.toolName ? { toolName: suspension.toolName } : {}),
		...(message ? { message } : {}),
	};
}

/** Trace metadata for a suspended segment: which tool waits for the user. */
export function buildSuspensionTraceMetadata(suspension: SuspensionInfo | undefined) {
	return {
		completion_source: 'orchestrator',
		...(suspension?.requestId ? { request_id: suspension.requestId } : {}),
		...(suspension?.toolCallId ? { pending_tool_call_id: suspension.toolCallId } : {}),
		...(suspension?.toolName ? { pending_tool_name: suspension.toolName } : {}),
	};
}
