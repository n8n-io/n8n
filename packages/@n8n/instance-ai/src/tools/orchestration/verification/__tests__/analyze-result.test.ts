import type { WorkflowBuildOutcome } from '../../../../workflow-loop/workflow-loop-state';
import { analyzeVerificationResult } from '../analyze-result';
import type { ExecutionRunResult } from '../types';

function makeBuildOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi_1',
		taskId: 'task_1',
		workflowId: 'wf_1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Built',
		...overrides,
	};
}

const buildOutcome = makeBuildOutcome({
	nodeSimulationPlan: [
		{
			nodeName: 'Email Approval',
			verdict: 'simulate',
			reason: 'Send-and-wait gate on a loop',
			confidence: 'high',
			source: 'deterministic',
			haltBranch: true,
		},
		{
			nodeName: 'Publish',
			verdict: 'simulate',
			reason: 'Sends a message',
			confidence: 'high',
			source: 'deterministic',
		},
	],
});

const result = {
	executionId: 'exec-1',
	status: 'success',
	executedNodeNames: ['Trigger', 'Format Draft', 'Email Approval'],
	lastNodeExecuted: 'Email Approval',
	data: { Trigger: [{}], 'Format Draft': [{}], 'Email Approval': [] },
} as unknown as ExecutionRunResult;

describe('analyzeVerificationResult — halted wait gates', () => {
	it('explains the expected stop at the gate instead of the generic zero-output guidance', () => {
		const analysis = analyzeVerificationResult({
			result,
			buildOutcome,
			simulatedNodes: [{ nodeName: 'Email Approval', reason: 'Send-and-wait gate on a loop' }],
			haltedGateNames: ['Email Approval'],
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(analysis.success).toBe(true);
		expect(analysis.nodesNotReached).toEqual(['Publish']);
		expect(analysis.coverageNote).toContain('halted at send-and-wait gate');
		expect(analysis.coverageNote).toContain('manual');
		expect(analysis.coverageNote).not.toContain('Seed matching test data');
	});

	it('keeps the generic partial-coverage guidance when no gate halted the run', () => {
		const analysis = analyzeVerificationResult({
			result,
			buildOutcome,
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(analysis.coverageNote).toContain('Partial coverage');
	});
});
