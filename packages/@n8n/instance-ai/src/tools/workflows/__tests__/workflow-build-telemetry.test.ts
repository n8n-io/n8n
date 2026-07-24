import type { InstanceAiContext } from '../../../types';
import { trackWaitGateVerificationPlan } from '../workflow-build-telemetry';

function makeContext(trackTelemetry = vi.fn()): InstanceAiContext {
	return {
		trackTelemetry,
		threadId: 'thread-1',
		runId: 'run-1',
	} as unknown as InstanceAiContext;
}

describe('trackWaitGateVerificationPlan', () => {
	it('emits gate counts and the multi-gate flag', () => {
		const trackTelemetry = vi.fn();

		trackWaitGateVerificationPlan(makeContext(trackTelemetry), {
			haltedGateCount: 2,
			scriptedGateCount: 0,
			savedWorkflowId: 'wf-1',
		});

		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_wait_gate_verification_plan',
			expect.objectContaining({
				halted_gate_count: 2,
				scripted_gate_count: 0,
				multi_gate: true,
				scripted: false,
				workflow_id: 'wf-1',
				thread_id: 'thread-1',
				run_id: 'run-1',
			}),
		);
	});

	it('stays silent for builds without halted gates', () => {
		const trackTelemetry = vi.fn();

		trackWaitGateVerificationPlan(makeContext(trackTelemetry), {
			haltedGateCount: 0,
			scriptedGateCount: 0,
			savedWorkflowId: 'wf-1',
		});

		expect(trackTelemetry).not.toHaveBeenCalled();
	});
});
