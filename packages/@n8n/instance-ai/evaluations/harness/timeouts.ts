// ---------------------------------------------------------------------------
// Build conversation budgets
//
// Three clocks bound a build conversation. The values come from the traces of
// the model-comparison-v2 sweeps of 2026-09-23/24 (174 completed turns).
// ---------------------------------------------------------------------------

import type { BuildTimeout } from '../types';

/**
 * Conversation budget, in turn budgets. A conversation may spend this many
 * `--timeout-ms` budgets in total, measured from the opening message. Every
 * productive conversation that hit the old single budget would have finished
 * within 1.6 of them; one runaway turn plus normal turns fits in 2.
 */
export const CONVERSATION_BUDGET_TURNS = 2;

/**
 * A run in flight that emits no event for this long is cancelled as stalled.
 * The longest silence inside a run that later resumed was 190 s; stalled runs
 * stayed silent for 730 to 867 s.
 */
export const INACTIVITY_TIMEOUT_MS = 240_000;

/**
 * A follow-up is sent only when at least this much conversation budget is left
 * (or a quarter of a turn budget, when that is smaller). A turn that starts with
 * less cannot finish, and grading the state saved so far beats cancelling a turn
 * seconds after it started.
 */
export const MIN_TURN_BUDGET_MS = 120_000;

/** Thrown by the chat loop when a budget fires; carries which one and when. */
export class RunTimeoutError extends Error {
	constructor(readonly timeout: BuildTimeout) {
		super(
			`Run timed out after ${String(timeout.elapsedMs)}ms (${timeout.kind} budget, user turn ${String(timeout.turn)})`,
		);
		this.name = 'RunTimeoutError';
	}
}
