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

	it('includes precomputed replacement suggestions in recovery guidance', () => {
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
			chatModelRelatedNodeNames: new Set(['Gemini Chat Model', 'AI Agent']),
			chatModelRecovery: {
				suggestionsByNodeName: new Map([
					['Gemini Chat Model', ['gemini-3-flash']],
					['AI Agent', ['gemini-3-flash']],
				]),
				creditsCoveredNodeNames: new Set<string>(),
			},
		});

		expect(analysis.remediation?.reason).toBe('chat_model_failure');
		expect(analysis.remediation?.guidance).toContain('Prefer one of: "gemini-3-flash"');
		expect(analysis.remediation?.guidance).not.toContain('n8n credits');
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

	it('adds n8n credits guidance for chat-model scoped quota failures when credits are available', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'You exceeded your current quota, please check your plan and billing details',
				lastNodeExecuted: 'OpenAI Chat Model',
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model']),
			chatModelRecovery: {
				suggestionsByNodeName: new Map(),
				creditsCoveredNodeNames: new Set(['OpenAI Chat Model']),
			},
		});

		expect(analysis.remediation?.category).toBe('needs_setup');
		expect(analysis.remediation?.guidance).toContain('n8n credits');
	});

	it('omits n8n credits from quota guidance when the instance has no gateway coverage', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'You exceeded your current quota, please check your plan and billing details',
				lastNodeExecuted: 'OpenAI Chat Model',
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model']),
			chatModelRecovery: {
				suggestionsByNodeName: new Map(),
				creditsCoveredNodeNames: new Set<string>(),
			},
		});

		expect(analysis.remediation?.category).toBe('needs_setup');
		expect(analysis.remediation?.guidance).not.toContain('n8n credits');
		expect(analysis.remediation?.guidance).toContain('another provider or key');
	});

	it("does not borrow another node's suggestions when the failing node has none", () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'The model "gpt-3.5-turbo" was not found',
				lastNodeExecuted: 'AI Agent',
				nodeErrors: [{ nodeName: 'AI Agent', message: 'The model "gpt-3.5-turbo" was not found' }],
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model', 'AI Agent']),
			chatModelRecovery: {
				suggestionsByNodeName: new Map([['Anthropic Chat Model', ['claude-x']]]),
				creditsCoveredNodeNames: new Set<string>(),
			},
		});

		expect(analysis.remediation?.reason).toBe('chat_model_failure');
		expect(analysis.remediation?.guidance).not.toContain('claude-x');
		expect(analysis.remediation?.guidance).toContain('explore-resources');
	});

	it('omits n8n credits when the gateway covers a different node than the failing one', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'You exceeded your current quota, please check your plan and billing details',
				lastNodeExecuted: 'Mistral Chat Model',
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model', 'Mistral Chat Model']),
			chatModelRecovery: {
				suggestionsByNodeName: new Map(),
				creditsCoveredNodeNames: new Set(['OpenAI Chat Model']),
			},
		});

		expect(analysis.remediation?.category).toBe('needs_setup');
		expect(analysis.remediation?.guidance).not.toContain('n8n credits');
		expect(analysis.remediation?.guidance).toContain('another provider or key');
	});

	it('retains generic credential guidance for non-chat node quota failures', () => {
		const analysis = analyzeVerificationResult({
			result: {
				executionId: 'exec-1',
				status: 'error',
				error: 'Google Sheets API error: Quota exceeded for quota metric Read requests',
				lastNodeExecuted: 'Google Sheets',
			} as unknown as ExecutionRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
			chatModelRelatedNodeNames: new Set(['OpenAI Chat Model']),
		});

		expect(analysis.remediation?.category).toBe('needs_setup');
		expect(analysis.remediation?.guidance).not.toContain('n8n credits');
	});
});

describe('analyzeVerificationResult — workflow-pinned nodes', () => {
	const pinnedRunResult = {
		executionId: 'exec-1',
		status: 'success',
		executedNodeNames: ['Trigger', 'Get Job Alert Emails', 'Mark Email Processed'],
		lastNodeExecuted: 'Mark Email Processed',
		data: {
			Trigger: [{}],
			'Get Job Alert Emails': [{ id: 'msg_1' }],
			'Mark Email Processed': [{}],
		},
		workflowPinnedNodeNames: ['Get Job Alert Emails', 'Unreached Pinned Node'],
	} as unknown as ExecutionRunResult;

	it('counts reached pinned nodes as simulated so the run is not treated as live', () => {
		const analysis = analyzeVerificationResult({
			result: pinnedRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [],
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(analysis.reachedSimulatedNodes).toEqual([
			{
				nodeName: 'Get Job Alert Emails',
				reason: 'Output came from pinned data saved on the workflow — unpin it for a live test',
			},
		]);
		expect(analysis.simulationNote).toContain('Get Job Alert Emails');
		expect(analysis.simulationNote).toContain('pinned data saved on the workflow');
	});

	it('does not duplicate nodes the simulation plan already covers', () => {
		const analysis = analyzeVerificationResult({
			result: pinnedRunResult,
			buildOutcome: makeBuildOutcome(),
			simulatedNodes: [{ nodeName: 'Get Job Alert Emails', reason: 'Mocked credentials' }],
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(analysis.reachedSimulatedNodes).toEqual([
			{ nodeName: 'Get Job Alert Emails', reason: 'Mocked credentials' },
		]);
	});
});
