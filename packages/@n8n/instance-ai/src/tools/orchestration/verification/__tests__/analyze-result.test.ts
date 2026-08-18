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
		expect(analysis.coverageNote).toContain('pauses at wait gate');
		expect(analysis.coverageNote).toContain('live end-to-end test');
		// Gate-agnostic wording: no approval/human-decision claims (the halt also
		// covers time-based Wait and Form gates), and non-gate dead ends keep the
		// seed-and-re-run guidance instead of being attributed to the gate.
		expect(analysis.coverageNote).not.toContain('human decision');
		expect(analysis.coverageNote).toContain('NOT behind the gate');
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

describe('analyzeVerificationResult — chat model failures', () => {
	it('routes model-not-found errors on chat-model-related nodes to targeted repair guidance', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'The model "models/gemini-2.5-flash" was not found',
				lastNodeExecuted: 'AI Agent',
				nodeErrors: [
					{
						nodeName: 'AI Agent',
						message: 'The model "models/gemini-2.5-flash" was not found',
					},
				],
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model', 'AI Agent']),
		});

		expect(analysis.success).toBe(false);
		expect(analysis.remediation?.reason).toBe('chat_model_failure');
		expect(analysis.remediation?.shouldEdit).toBe(true);
		expect(analysis.remediation?.guidance).toContain('explore-resources');
	});

	it('does not classify a model-shaped HTTP Request failure as a chat-model failure', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'Resource not found',
				lastNodeExecuted: 'HTTP Request',
				nodeErrors: [{ nodeName: 'HTTP Request', message: 'Resource not found' }],
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model', 'AI Agent']),
		});

		expect(analysis.remediation?.reason).toBe('runtime_failure');
	});

	it('adds n8n credits guidance for quota failures', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'You exceeded your current quota, please check your plan and billing details',
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(analysis.remediation?.category).toBe('needs_setup');
		expect(analysis.remediation?.guidance).toContain('n8n credits');
	});
});
