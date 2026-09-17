import type { OrchestrationContext } from '../types';

/**
 * Why a run handed off before its own stop condition.
 *
 * - `planned-tasks-scheduled`: the run finished its turn and detached the
 *   planned tasks; a follow-up run re-enters. Not a terminal outcome.
 * - `user-steered`: the user sent a new instruction, so the run stopped at the
 *   step boundary that drained it. The run IS terminal — it completed the work it
 *   had — and the instruction becomes the next run.
 */
export type OrchestratorRunHandoffReason = 'planned-tasks-scheduled' | 'user-steered';

export interface OrchestratorRunHandoffState {
	handoffReason?: OrchestratorRunHandoffReason;
}

export interface OrchestratorRunStopSignal {
	reason: OrchestratorRunHandoffReason;
}

export interface OrchestratorRunControl {
	readonly state: OrchestratorRunHandoffState;
	requestHandoff(reason: OrchestratorRunHandoffReason): void;
	getStopSignal(): OrchestratorRunStopSignal | undefined;
	shouldEmitTerminalOutcome(stopReason?: OrchestratorRunHandoffReason): boolean;
}

export function createOrchestratorRunControl(
	context?: OrchestrationContext,
	state: OrchestratorRunHandoffState = {},
): OrchestratorRunControl {
	const control: OrchestratorRunControl = {
		state,
		requestHandoff(reason) {
			state.handoffReason ??= reason;
		},
		getStopSignal() {
			return state.handoffReason ? { reason: state.handoffReason } : undefined;
		},
		shouldEmitTerminalOutcome(stopReason) {
			// A steered run really ended: it needs its terminal outcome, its trace root
			// and its run-finish, exactly like a run that reached its own stop. Only
			// the planned-tasks handoff hands the turn over without ending it.
			return stopReason === undefined || stopReason === 'user-steered';
		},
	};

	if (context) {
		context.requestRunHandoff = (reason) => control.requestHandoff(reason);
	}

	return control;
}

export function createOrchestratorRunControlForState(
	state?: OrchestratorRunHandoffState,
): OrchestratorRunControl {
	return createOrchestratorRunControl(undefined, state);
}
