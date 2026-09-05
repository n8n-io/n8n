import { isLlmMessage } from '../../sdk/message';
import type { AgentMessage, ContentToolCall, MessageContent } from '../../types/sdk/message';

/**
 * Settle pending local tool-call blocks in loaded thread history by rejecting
 * them with an explanation that the call never completed. Remove pending
 * provider-executed calls because a local result is invalid for their protocol.
 *
 * A pending block in *history* means a previous turn suspended on the call
 * (usually awaiting a user confirmation) and was never resumed — the user
 * typed a new message instead, the confirmation timed out, or the process
 * restarted. Silently dropping the block (what `stripOrphanedToolMessages`
 * does for the mid-run path) erases the only evidence the action was ever
 * attempted, so the model may describe the action as done or blindly re-fire
 * it. Rejecting it with an explicit "did not take effect" record keeps the
 * model's view of the world truthful (INS-1223).
 *
 * Only for history loads. The mid-run serialization path must keep using
 * `stripOrphanedToolMessages`: there a pending block is the *current* turn's
 * live suspension, which receives its real result on resume.
 */
export function settleOrphanedToolMessages<T extends AgentMessage>(messages: T[]): T[] {
	const result: T[] = [];

	for (const msg of messages) {
		if (!isLlmMessage(msg)) {
			result.push(msg);
			continue;
		}
		if (!msg.content.some((block) => block.type === 'tool-call' && block.state === 'pending')) {
			result.push(msg);
			continue;
		}

		const content = msg.content.flatMap((block: MessageContent) => {
			if (block.type !== 'tool-call' || block.state !== 'pending') return block;
			// Provider tools execute inside the model response. A synthetic local
			// result is not valid for their server tool-call protocol.
			if (block.providerExecuted) return [];
			const { suspension, ...rest } = block;
			return {
				...rest,
				state: 'rejected' as const,
				error: buildAbandonedSuspensionError(block),
			};
		});
		if (content.length > 0) result.push({ ...msg, content });
	}

	return result;
}

function buildAbandonedSuspensionError(
	block: Extract<ContentToolCall, { state: 'pending' }>,
): string {
	const card = block.suspension?.message
		? ` The user was shown a confirmation ("${block.suspension.message}") and never answered it.`
		: " It was awaiting the user's confirmation (or the session was interrupted) and was never resumed.";
	return (
		`INTERRUPTED — this ${block.toolName} call never completed.${card}` +
		' Its action did NOT take effect: nothing was saved, executed, or applied by this call.' +
		' Do not describe this action as done. If it is still needed, explain to the user that it' +
		' requires their approval and what approving will do, then re-issue it once.'
	);
}

/**
 * Strip pending tool-call blocks from a message list before sending to the LLM.
 *
 * This function:
 *  1. Drops any tool-call block whose state is 'pending'.
 *  2. If a message becomes empty after stripping, drops the message entirely.
 *  3. Preserves all other content (text, reasoning, files, resolved/rejected
 *     tool-call blocks, and non-LLM custom messages).
 */
export function stripOrphanedToolMessages<T extends AgentMessage>(messages: T[]): T[] {
	const result: T[] = [];

	for (const msg of messages) {
		if (!isLlmMessage(msg)) {
			result.push(msg);
			continue;
		}

		const filtered = msg.content.filter((block: MessageContent) => {
			if (block.type === 'tool-call' && block.state === 'pending') {
				return false;
			}
			return true;
		});

		if (filtered.length === 0) continue;

		result.push({ ...msg, content: filtered });
	}

	return result;
}
