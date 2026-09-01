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

	// INS-1130: the setup and credential tools are domain tools, built from `domainContext`
	// rather than the orchestration context. Wiring only the latter left them silently
	// unable to yield the turn — `requestRunHandoff?.()` is optional, so the miss is a
	// no-op rather than a crash, and the settle leg would run on to a model call.
	it('attaches the same callback to the domain context domain tools are built from', () => {
		const domainContext = {} as NonNullable<OrchestrationContext['domainContext']>;
		const context = { domainContext } as OrchestrationContext;
		const control = createOrchestratorRunControl(context);

		domainContext.requestRunHandoff?.('user-message-received');

		expect(control.getStopSignal()).toEqual({ reason: 'user-message-received' });
	});

	// The tool captures the callback during the original run; the resume rebuilds the
	// control from the persisted state object. They must be the same object or the reason
	// the tool records is invisible to the leg that reads it.
	it('sees a handoff recorded through the context by a control recreated from its state', () => {
		const domainContext = {} as NonNullable<OrchestrationContext['domainContext']>;
		const context = { domainContext } as OrchestrationContext;
		const original = createOrchestratorRunControl(context);

		const resumed = createOrchestratorRunControlForState(original.state);
		domainContext.requestRunHandoff?.('user-message-received');

		expect(resumed.getStopSignal()).toEqual({ reason: 'user-message-received' });
		expect(resumed.shouldEmitTerminalOutcome('user-message-received')).toBe(false);
	});

	it('can be recreated from existing handoff state without a context', () => {
		const state = { handoffReason: 'planned-tasks-scheduled' as const };
		const control = createOrchestratorRunControlForState(state);

		expect(control.getStopSignal()).toEqual({ reason: 'planned-tasks-scheduled' });
		expect(control.shouldEmitTerminalOutcome()).toBe(true);
	});
});
