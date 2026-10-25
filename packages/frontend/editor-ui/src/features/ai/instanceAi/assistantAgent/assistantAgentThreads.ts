import type { InstanceAiAttachment } from '@n8n/api-types';

/** Id of the n8n Assistant system agent on the agents runtime. */
export const ASSISTANT_AGENT_ID = 'assistant';

/**
 * Which runtime runs a thread at `/assistant/:threadId`: the current Assistant
 * runtime, or the Assistant agent on the agents runtime with the project of
 * its thread.
 */
export type AssistantThreadRuntime =
	| { kind: 'assistant' }
	| { kind: 'assistant-agent'; projectId: string };

/**
 * Assistant agent threads that this tab created or found, with their project.
 * Module-level state: it saves a lookup when the user opens the thread again.
 */
const knownAgentThreads = new Map<string, string>();

export function rememberAssistantAgentThread(threadId: string, projectId: string): void {
	knownAgentThreads.set(threadId, projectId);
}

/** The runtime of a thread when it is known without a request, else `undefined`. */
export function knownAssistantThreadRuntime(
	threadId: string,
	options: { assistantAgentEnabled: boolean; isAssistantThread: (threadId: string) => boolean },
): AssistantThreadRuntime | undefined {
	const projectId = knownAgentThreads.get(threadId);
	if (projectId) return { kind: 'assistant-agent', projectId };
	if (!options.assistantAgentEnabled || options.isAssistantThread(threadId)) {
		return { kind: 'assistant' };
	}
	return undefined;
}

/**
 * Asks the agents runtime for a thread that is not known yet. A thread that it
 * does not find opens in the current Assistant view, which handles a missing
 * thread.
 */
export async function lookUpAssistantThreadRuntime(
	threadId: string,
	fetchAgentThread: (threadId: string) => Promise<{ projectId: string }>,
): Promise<AssistantThreadRuntime> {
	try {
		const { projectId } = await fetchAgentThread(threadId);
		rememberAssistantAgentThread(threadId, projectId);
		return { kind: 'assistant-agent', projectId };
	} catch {
		return { kind: 'assistant' };
	}
}

/**
 * The first message of a new Assistant agent thread. The empty view stores it
 * before it opens the thread, and the thread view sends it once its chat panel
 * is ready.
 */
export interface PendingAssistantAgentMessage {
	threadId: string;
	text: string;
	files: File[];
	/** Workflow and other resource references. They go to the agent in the client context. */
	references: InstanceAiAttachment[];
}

let pendingMessage: PendingAssistantAgentMessage | undefined;

export function stashPendingAssistantAgentMessage(message: PendingAssistantAgentMessage): void {
	pendingMessage = message;
}

/** One-shot read. It always clears the slot, so a message never reaches another thread. */
export function consumePendingAssistantAgentMessage(
	threadId: string,
): PendingAssistantAgentMessage | undefined {
	const message = pendingMessage;
	pendingMessage = undefined;
	return message?.threadId === threadId ? message : undefined;
}

/** Clears the slot only if it still holds this message, after a failed hand-off. */
export function discardPendingAssistantAgentMessage(
	message: PendingAssistantAgentMessage,
): boolean {
	if (pendingMessage !== message) return false;
	pendingMessage = undefined;
	return true;
}
