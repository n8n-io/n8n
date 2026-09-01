import type { OrchestrationContext } from '../types';

export type OrchestratorRunHandoffReason =
	| 'planned-tasks-scheduled'
	/** The user sent a new message instead of answering an open confirmation card.
	 *  The suspended tool settles and yields the turn; the message runs as its own
	 *  run, so it stays a real user turn in history. */
	| 'user-message-received';

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
		const requestRunHandoff = (reason: OrchestratorRunHandoffReason) =>
			control.requestHandoff(reason);
		context.requestRunHandoff = requestRunHandoff;
		// Domain tools (`workflows`, `credentials`) are built from `domainContext`, which
		// `createInstanceAgent` spreads into a copy — so wiring only the orchestration
		// context would leave them unable to yield the turn. Both foreground call sites
		// construct the control before the agent, so the copy picks this up.
		if (context.domainContext) {
			context.domainContext.requestRunHandoff = requestRunHandoff;
		}
	}

	return control;
}

export function createOrchestratorRunControlForState(
	state?: OrchestratorRunHandoffState,
): OrchestratorRunControl {
	return createOrchestratorRunControl(undefined, state);
}
