/**
 * Thread-persisted agent-preview session binding. Mirrors agent-builder target
 * binding: the preview handoff injects a reference (not the transcript), and
 * follow-up turns must still resolve that reference so `get-session` stays
 * available after the first message.
 */
import { z } from 'zod';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

export const AGENT_PREVIEW_SESSION_METADATA_KEY = 'instanceAiAgentPreviewSession';

const agentPreviewSessionSchema = z.object({
	agentId: z.string(),
	threadId: z.string(),
	executionId: z.string().optional(),
});

export type AgentPreviewSession = z.infer<typeof agentPreviewSessionSchema>;

function parseSession(raw: unknown): AgentPreviewSession | undefined {
	const parsed = agentPreviewSessionSchema.safeParse(raw);
	return parsed.success ? parsed.data : undefined;
}

async function readThreadSession(
	context: InstanceAiContext,
): Promise<AgentPreviewSession | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	const thread = await getThread(context.threadMemory, context.threadId);
	return parseSession(thread?.metadata?.[AGENT_PREVIEW_SESSION_METADATA_KEY]);
}

/**
 * Resolve the bound preview session: in-memory context first (current run),
 * then the thread-persisted binding (previous turns). Hydrates the context so
 * subsequent calls in the same run skip the metadata read.
 */
export async function resolveAgentPreviewSession(
	context: InstanceAiContext,
): Promise<AgentPreviewSession | undefined> {
	if (context.agentPreviewSession) return context.agentPreviewSession;

	const session = await readThreadSession(context);
	if (session) context.agentPreviewSession = session;
	return session;
}

/**
 * Persist the preview session reference to thread metadata. A no-op (with a
 * warning) when thread persistence is unavailable.
 */
export async function saveAgentPreviewSession(
	context: InstanceAiContext,
	session: AgentPreviewSession,
): Promise<void> {
	if (!context.threadMemory || !context.threadId) {
		context.logger?.warn('Cannot persist agent-preview session: no thread persistence available', {
			agentId: session.agentId,
			previewThreadId: session.threadId,
		});
		return;
	}

	await patchThread(context.threadMemory, {
		threadId: context.threadId,
		update: ({ metadata = {} }) => ({
			metadata: { ...metadata, [AGENT_PREVIEW_SESSION_METADATA_KEY]: session },
		}),
	});
}
