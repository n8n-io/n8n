import { emitBuilderMetric } from '../../../tracing/builder-metric-event';
import type { InstanceAiContext, InstanceAiTraceContext } from '../../../types';
import type { WorkflowSourceFileBinding } from '../workflow-file-bindings';
import {
	trackWaitGateVerificationPlan,
	trackWorkflowSourceBuild,
} from '../workflow-build-telemetry';

vi.mock('../../../tracing/builder-metric-event', () => ({
	emitBuilderMetric: vi.fn(async () => await Promise.resolve()),
}));

const tracing = {} as InstanceAiTraceContext;

function makeContext(trackTelemetry = vi.fn()): InstanceAiContext {
	return {
		trackTelemetry,
		threadId: 'thread-1',
		runId: 'run-1',
		tracing,
		workflowBuildContext: { workItemId: 'wi_1' },
	} as unknown as InstanceAiContext;
}

const binding = { filePath: 'workflows/main.ts' } as WorkflowSourceFileBinding;

describe('trackWorkflowSourceBuild', () => {
	beforeEach(() => {
		vi.mocked(emitBuilderMetric).mockClear();
	});

	it('records a successful save as a workflow_build trace metric', () => {
		trackWorkflowSourceBuild(makeContext(), {
			result: 'success',
			stage: 'save',
			binding,
			savedWorkflowId: 'wf-1',
			saveOperation: 'create',
		});

		expect(emitBuilderMetric).toHaveBeenCalledWith(tracing, 'workflow_build', {
			success: true,
			result: 'success',
			stage: 'save',
			operation: 'create',
			workflow_id: 'wf-1',
			work_item_id: 'wi_1',
			is_supporting_workflow: false,
			error_count: 0,
			remediation_category: undefined,
		});
	});

	it('does not record a save that waits for approval', () => {
		trackWorkflowSourceBuild(makeContext(), {
			result: 'suspended',
			stage: 'hitl',
			binding,
			targetWorkflowId: 'wf-1',
		});

		expect(emitBuilderMetric).not.toHaveBeenCalled();
	});

	it('records a failed build with its stage and remediation', () => {
		trackWorkflowSourceBuild(makeContext(), {
			result: 'failure',
			stage: 'parse',
			binding,
			targetWorkflowId: 'wf-1',
			errorCount: 2,
			remediation: { category: 'code_fixable', shouldEdit: true, guidance: 'Fix the import' },
		});

		expect(emitBuilderMetric).toHaveBeenCalledWith(
			tracing,
			'workflow_build',
			expect.objectContaining({
				success: false,
				result: 'failure',
				stage: 'parse',
				workflow_id: 'wf-1',
				error_count: 2,
				remediation_category: 'code_fixable',
			}),
		);
	});
});

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
