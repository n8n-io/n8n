import type { OrchestrationContext } from '../types';

export type OrchestratorRunHandoffReason = 'planned-tasks-scheduled';

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
			return stopReason === undefined;
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
