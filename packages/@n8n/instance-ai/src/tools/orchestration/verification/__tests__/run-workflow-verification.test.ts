import type { InstanceAiExecutionService } from '../../../../types';
import type { WorkflowBuildOutcome } from '../../../../workflow-loop/workflow-loop-state';
import { prepareVerificationRun } from '../prepare-run';
import { runWorkflowVerification } from '../run-workflow-verification';

const buildOutcome: WorkflowBuildOutcome = {
	workItemId: 'candidate-1',
	taskId: 'candidate-1',
	workflowId: 'workflow-1',
	submitted: false,
	triggerType: 'manual_or_testable',
	needsUserInput: false,
	summary: 'Candidate verification',
	nodeSimulationPlan: [
		{
			nodeName: 'Send message',
			verdict: 'simulate',
			reason: 'Sends a message',
			confidence: 'high',
			source: 'deterministic',
		},
		{
			nodeName: 'Process result',
			verdict: 'execute',
			reason: 'Transforms data',
			confidence: 'high',
			source: 'deterministic',
		},
	],
	simulationFixtures: { 'Send message': [{ id: 'message-1' }] },
};

describe('runWorkflowVerification', () => {
	it('does not start an execution after cancellation', async () => {
		const run = vi.fn<InstanceAiExecutionService['run']>();
		const controller = new AbortController();
		controller.abort();

		await expect(
			runWorkflowVerification({
				executionService: { run },
				workflowId: 'workflow-1',
				buildOutcome,
				prepared: { verificationPinData: undefined, simulatedNodes: [], haltedGateNames: [] },
				stateBefore: undefined,
				runId: 'run-1',
				abortSignal: controller.signal,
			}),
		).rejects.toThrow();

		expect(run).not.toHaveBeenCalled();
	});

	it('runs with prepared fixtures and reports simulated and unreached nodes without a builder task', async () => {
		const run = vi.fn<InstanceAiExecutionService['run']>().mockResolvedValue({
			executionId: 'execution-1',
			status: 'success',
			executedNodeNames: ['Trigger', 'Send message'],
			injectedTriggerNodeName: 'Trigger',
		});
		const preparation = prepareVerificationRun(buildOutcome, {});
		if (preparation.kind !== 'ready') throw new Error('Expected verification fixtures');
		const abortSignal = new AbortController().signal;
		const inputData = { message: 'Test' };

		const { analysis, parameterCheckRuns } = await runWorkflowVerification({
			executionService: { run },
			workflowId: 'workflow-1',
			inputData,
			triggerNodeName: 'Trigger',
			timeout: 5000,
			abortSignal,
			buildOutcome,
			prepared: preparation.prepared,
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(run).toHaveBeenCalledWith('workflow-1', inputData, {
			timeout: 5000,
			triggerNodeName: 'Trigger',
			verificationPinData: { 'Send message': [{ id: 'message-1' }] },
			isVerificationRun: true,
			abortSignal,
		});
		expect(analysis.success).toBe(true);
		expect(analysis.nodesNotReached).toEqual(['Process result']);
		expect(analysis.coverageNote).toContain('Process result');
		expect(analysis.reachedSimulatedNodes.map((node) => node.nodeName)).toEqual([
			'Send message',
			'Trigger',
		]);
		expect(parameterCheckRuns).toEqual([
			{ executionId: 'execution-1', nodeNames: ['Send message', 'Trigger'] },
		]);
	});

	it('runs the prepared gate script with its decision data and cut edge', async () => {
		const script = {
			nodeName: 'Approval',
			cutEdge: { source: 'Process result', target: 'Approval' },
			decisions: [{ label: 'approve', items: [{ approved: true }] }],
		};
		const run = vi.fn<InstanceAiExecutionService['run']>().mockResolvedValue({
			executionId: 'approve-1',
			status: 'success',
			executedNodeNames: ['Approval'],
		});

		const { parameterCheckRuns } = await runWorkflowVerification({
			executionService: { run },
			workflowId: 'workflow-1',
			buildOutcome,
			prepared: {
				verificationPinData: { Approval: [] },
				simulatedNodes: [{ nodeName: 'Approval', reason: 'Waits for a decision' }],
				haltedGateNames: ['Approval'],
				gateScript: script,
			},
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(run).toHaveBeenCalledOnce();
		expect(run).toHaveBeenCalledWith(
			'workflow-1',
			undefined,
			expect.objectContaining({
				verificationPinData: { Approval: [{ approved: true }] },
				omitConnections: [script.cutEdge],
				isVerificationRun: true,
			}),
		);
		expect(parameterCheckRuns).toEqual([{ executionId: 'approve-1', nodeNames: ['Approval'] }]);
	});
});
