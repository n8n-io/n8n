import type { ChatTurn } from './types';

/**
 * One message from the person can span two executions: one that stops to ask
 * for approval, and one that resumes after the answer and opens with the
 * `hitl-response`. Join the second to the first, so a turn that waited for
 * approval is not read as a turn with no reply.
 */
export function mergeResumedTurns(turns: ChatTurn[]): ChatTurn[] {
	const merged: ChatTurn[] = [];
	for (const turn of turns) {
		const previous = merged.at(-1);
		if (previous && turn.timeline?.[0]?.type === 'hitl-response') {
			merged[merged.length - 1] = {
				userMessage: previous.userMessage,
				reply: [previous.reply, turn.reply].filter(Boolean).join('\n'),
				timeline: [...(previous.timeline ?? []), ...turn.timeline],
				...(previous.runFailed || turn.runFailed ? { runFailed: true } : {}),
			};
			continue;
		}
		merged.push(turn);
	}
	return merged;
}
