import type { OrchestrationContext } from '../../types';
import {
	createOrchestratorRunControl,
	createOrchestratorRunControlForState,
} from '../orchestrator-run-control';

function createContext(): OrchestrationContext {
	return {} as OrchestrationContext;
}

describe('createOrchestratorRunControl', () => {
	it('attaches a run handoff callback to the orchestration context', () => {
		const context = createContext();
		const control = createOrchestratorRunControl(context);

		context.requestRunHandoff?.('planned-tasks-scheduled');

		expect(control.getStopSignal()).toEqual({ reason: 'planned-tasks-scheduled' });
		expect(control.shouldEmitTerminalOutcome(control.getStopSignal()?.reason)).toBe(false);
	});

	it('keeps the first handoff reason', () => {
		const control = createOrchestratorRunControl();

		control.requestHandoff('planned-tasks-scheduled');
		control.requestHandoff('planned-tasks-scheduled');

		expect(control.state).toEqual({ handoffReason: 'planned-tasks-scheduled' });
	});

	it('treats a steered run as terminal, unlike the planned-tasks handoff', () => {
		const control = createOrchestratorRunControl();

		control.requestHandoff('user-steered');

		expect(control.getStopSignal()).toEqual({ reason: 'user-steered' });
		// The run really ended, so it still needs its terminal outcome, its trace
		// root and its run-finish.
		expect(control.shouldEmitTerminalOutcome(control.getStopSignal()?.reason)).toBe(true);
	});

	it('keeps the first handoff reason when a steer lands after a plan handoff', () => {
		const control = createOrchestratorRunControl();

		control.requestHandoff('planned-tasks-scheduled');
		control.requestHandoff('user-steered');

		expect(control.state).toEqual({ handoffReason: 'planned-tasks-scheduled' });
	});

	it('can be recreated from existing handoff state without a context', () => {
		const state = { handoffReason: 'planned-tasks-scheduled' as const };
		const control = createOrchestratorRunControlForState(state);

		expect(control.getStopSignal()).toEqual({ reason: 'planned-tasks-scheduled' });
		expect(control.shouldEmitTerminalOutcome()).toBe(true);
	});
});
