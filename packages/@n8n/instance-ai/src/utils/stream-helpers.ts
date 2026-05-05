/**
 * Shared utilities for stream processing and HITL suspend/resume.
 * Eliminates duplication across agent tools and the service layer.
 */

/** Type guard for plain objects. */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Parsed suspension data from a `tool-call-suspended` chunk. */
export interface SuspensionInfo {
	toolCallId: string;
	requestId: string;
	toolName?: string;
}

/** Extract suspension info from a stream chunk. */
export function parseSuspension(chunk: unknown): SuspensionInfo | null {
	if (!isRecord(chunk) || chunk.type !== 'tool-call-suspended') return null;

	const sp = isRecord(chunk.payload) ? chunk.payload : chunk;
	const suspPayload = isRecord(sp.suspendPayload) ? sp.suspendPayload : {};
	const tcId = typeof sp.toolCallId === 'string' ? sp.toolCallId : '';
	const reqId =
		typeof suspPayload.requestId === 'string' && suspPayload.requestId
			? suspPayload.requestId
			: tcId;
	const toolName = typeof sp.toolName === 'string' ? sp.toolName : undefined;

	if (!reqId || !tcId) return null;
	return { toolCallId: tcId, requestId: reqId, toolName };
}

/** Type for Mastra's resumeStream method (not exported by the framework). */
export interface Resumable {
	resumeStream?: (
		data: Record<string, unknown>,
		options: Record<string, unknown>,
	) => Promise<unknown>;
	resume?: (
		method: 'stream',
		data: Record<string, unknown>,
		options: Record<string, unknown>,
	) => Promise<unknown>;
}

/** Cast an agent to Resumable for suspend/resume operations. */
export function asResumable(agent: unknown): Resumable {
	return agent as Resumable;
}

export async function resumeStream(
	agent: unknown,
	data: Record<string, unknown>,
	options: Record<string, unknown>,
): Promise<unknown> {
	if (!isRecord(agent)) {
		throw new Error('Agent does not support stream resume');
	}

	const resumable = asResumable(agent);

	if (typeof resumable.resumeStream === 'function') {
		return await resumable.resumeStream(data, options);
	}

	if (typeof resumable.resume === 'function') {
		return await resumable.resume('stream', data, options);
	}

	throw new Error('Agent does not support stream resume');
}
