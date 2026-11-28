import type { SerializableAgentState } from '@n8n/agents';
import { z } from 'zod';

/**
 * Continuation that a configured review stores on a suspended tool call.
 * Keep this module light: the runtime reads it on every workflow run.
 */
export const DECISION_CONTINUATION_SCHEMA = z.object({
	__agentDecisionWorkflow: z.literal(true),
	executionId: z.string(),
	definitionHash: z.string(),
	workflowVersionId: z.string().optional(),
	reviewIndex: z.number().int().min(0).default(0),
	backgroundApproval: z.literal(true).optional(),
	toolSuspended: z.boolean().optional(),
	toolContinuation: z.string().optional(),
});

/** A background approval owns a single tool call and cannot resume a parallel batch. */
export function getBackgroundApproval(
	state: SerializableAgentState,
	{ includeClaimed = false }: { includeClaimed?: boolean } = {},
) {
	if (state.status !== 'suspended' && !(includeClaimed && state.status === 'running'))
		return undefined;
	const [call, other] = Object.values(state.pendingToolCalls ?? {});
	if (!call?.suspended || other) return undefined;
	const continuation = DECISION_CONTINUATION_SCHEMA.safeParse(call.continuation);
	if (!continuation.success || !continuation.data.backgroundApproval) return undefined;
	const batch = state.messageList.messages.find(
		(message) =>
			'content' in message &&
			message.content.some(
				(block) => block.type === 'tool-call' && block.toolCallId === call.toolCallId,
			),
	);
	if (!batch || !('content' in batch)) return undefined;
	if (batch.content.filter((block) => block.type === 'tool-call').length !== 1) return undefined;
	return { call, executionId: continuation.data.executionId };
}
