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

	it('combines scripted decision coverage and reports a failed pass', async () => {
		const gateOutcome: WorkflowBuildOutcome = {
			...buildOutcome,
			nodeSimulationPlan: [
				{
					nodeName: 'Approval',
					verdict: 'simulate',
					reason: 'Waits for a decision',
					confidence: 'high',
					source: 'deterministic',
					haltBranch: true,
				},
				...(buildOutcome.nodeSimulationPlan ?? []),
			],
			waitGateScripts: [
				{
					nodeName: 'Approval',
					cutEdge: { source: 'Process result', target: 'Approval' },
					decisions: [
						{ label: 'approve', items: [{ approved: true }] },
						{ label: 'decline', items: [{ approved: false }] },
					],
				},
			],
		};
		const preparation = prepareVerificationRun(gateOutcome, {});
		if (preparation.kind !== 'ready') throw new Error('Expected verification fixtures');
		const run = vi
			.fn<InstanceAiExecutionService['run']>()
			.mockResolvedValueOnce({
				executionId: 'approve-1',
				status: 'success',
				executedNodeNames: ['Approval', 'Send message'],
			})
			.mockResolvedValueOnce({
				executionId: 'decline-1',
				status: 'success',
				executedNodeNames: ['Approval', 'Process result'],
				nodeErrors: [{ nodeName: 'Process result', message: 'Invalid field' }],
			});

		const { result, analysis, parameterCheckRuns } = await runWorkflowVerification({
			executionService: { run },
			workflowId: 'workflow-1',
			buildOutcome: gateOutcome,
			prepared: preparation.prepared,
			stateBefore: undefined,
			runId: 'run-1',
		});

		expect(run).toHaveBeenCalledTimes(2);
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: {
				Approval: [{ approved: true }],
				'Send message': [{ id: 'message-1' }],
			},
			omitConnections: [{ source: 'Process result', target: 'Approval' }],
			isVerificationRun: true,
		});
		expect(result.status).toBe('error');
		expect(analysis.success).toBe(false);
		expect(analysis.nodesNotReached).toEqual([]);
		expect(analysis.nodeErrors).toEqual([
			{ nodeName: 'Process result', message: '[decision: decline] Invalid field' },
		]);
		expect(parameterCheckRuns).toEqual([
			{ executionId: 'approve-1', nodeNames: ['Approval', 'Send message'] },
			{ executionId: 'decline-1', nodeNames: ['Approval'] },
		]);
	});
});
