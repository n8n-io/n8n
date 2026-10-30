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

/**
 * The whole turn that an execution belongs to. A reply in the chat carries the
 * id of the execution that wrote it, which for an approved action is the
 * resume: checks must read that turn from the message that started it.
 */
export function turnForExecution(
	executions: Array<{ id: string; turn: ChatTurn }>,
	executionId: string,
): ChatTurn | undefined {
	const groups: Array<Array<{ id: string; turn: ChatTurn }>> = [];
	for (const execution of executions) {
		const group = groups.at(-1);
		if (group && execution.turn.timeline?.[0]?.type === 'hitl-response') group.push(execution);
		else groups.push([execution]);
	}
	const group = groups.find((g) => g.some((execution) => execution.id === executionId));
	return group ? mergeResumedTurns(group.map((execution) => execution.turn))[0] : undefined;
}
