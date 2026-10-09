import type { AgentPersistedMessageContentPart } from '@n8n/api-types';

/** A tool-call content part that carries its tool call id. */
export type ToolCallContentPart = AgentPersistedMessageContentPart & {
	type: 'tool-call';
	toolCallId: string;
};

export function isToolCallWithId(
	part: AgentPersistedMessageContentPart,
): part is ToolCallContentPart {
	return part.type === 'tool-call' && typeof part.toolCallId === 'string' && part.toolCallId !== '';
}

/** Whether a tool call has its result, its error or its cancellation, so it no longer waits. */
export function isTerminalToolCallPart(part: AgentPersistedMessageContentPart): boolean {
	return (
		part.type === 'tool-call' &&
		(part.state === 'resolved' ||
			part.state === 'rejected' ||
			part.canceled === true ||
			part.output !== undefined ||
			part.error !== undefined)
	);
}

/**
 * Whether a settled part records only the result of a call that an earlier turn started. The
 * recorder of a resumed turn gets the result without the call, so the part has no input. The
 * model always sends an input with a call that it starts.
 */
export function isResultRecord(part: AgentPersistedMessageContentPart): boolean {
	return isTerminalToolCallPart(part) && part.input === undefined;
}

/**
 * The identity of one tool call in a thread. A model can use a tool call id again in a later
 * turn (for example a model that counts its ids from 1 in each response), so the id alone
 * does not identify a call. The tool name is part of the identity.
 */
export function toolCallKey(part: ToolCallContentPart): string {
	return JSON.stringify([part.toolCallId, part.toolName ?? null]);
}
