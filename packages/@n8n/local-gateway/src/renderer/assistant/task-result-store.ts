/*
 * Module-scoped store for the one-shot task result card, so it floats at App
 * level (like the permission prompt stack) and stays visible when the chat
 * overlay covers the home view. No pinia — plain module-level reactive state,
 * matching `use-pending-tasks.ts`.
 */
import { reactive, readonly } from 'vue';

/**
 * The card shown once a one-shot run finishes:
 * - `done`: the assistant did the thing — offer to keep it as a saved task.
 *   `label` is the agent's outcome title (or the truncated prompt) and doubles
 *   as the workflow name when the task is kept. `details` is the task's actual
 *   output (markdown) for information deliverables — a summary, an answer —
 *   and this card is the only place the user ever sees it.
 * - `handoff`: the agent reported a failed task outcome — point the user to
 *   the instance UI; `message` is the agent's failure reason when it gave one.
 * - `error`: the run errored, timed out, or was canceled.
 */
export type TaskResultCard =
	| {
			kind: 'done';
			threadId: string;
			label: string;
			icon?: string;
			summary?: string;
			details?: string;
	  }
	| { kind: 'handoff'; message?: string }
	| { kind: 'error'; message: string };

const state = reactive<{ card: TaskResultCard | null }>({ card: null });

export const taskResultState = readonly(state);

export function showTaskResult(card: TaskResultCard): void {
	state.card = card;
}

export function dismissTaskResult(): void {
	state.card = null;
}
