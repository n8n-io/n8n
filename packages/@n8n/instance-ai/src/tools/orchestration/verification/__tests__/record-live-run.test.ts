import type { InstanceAiContext } from '../../../../types';
import type { WorkflowBuildOutcome } from '../../../../workflow-loop/workflow-loop-state';
import { recordLiveRunVerification } from '../record-live-run';
import type { ExecutionRunResult } from '../types';

function makeOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi_1',
		taskId: 'task_1',
		workflowId: 'wf_1',
		submitted: true,
		triggerType: 'trigger_only',
		needsUserInput: false,
		summary: 'Built',
		nodeSimulationPlan: [
			{
				nodeName: 'Send Telegram Message',
				verdict: 'simulate',
				reason: 'Sends a message to a Telegram chat.',
				confidence: 'high',
				source: 'deterministic',
			},
		],
		verification: {
			attempted: true,
			success: true,
			status: 'success',
			claim: {
				level: 'partial',
				plannedNodeCount: 1,
				reachedNodeCount: 1,
				nodesNotReached: [],
				simulatedNodes: [
					{ nodeName: 'Send Telegram Message', reason: 'Sends a message to a Telegram chat.' },
				],
				pinnedNodes: [],
				unprovenTargets: [],
				publishReady: false,
				liveTestRecommended: true,
			},
		},
		...overrides,
	};
}

function makeRunResult(overrides: Partial<ExecutionRunResult> = {}): ExecutionRunResult {
	return {
		executionId: 'exec-2',
		status: 'success',
		data: { 'Every Morning': [{}], 'Send Telegram Message': [{ ok: true }] },
		executedNodeNames: ['Every Morning', 'Send Telegram Message'],
		workflowVersionId: 'version-2',
		...overrides,
	};
}

function createContext({
	outcome = makeOutcome(),
}: { outcome?: WorkflowBuildOutcome | null } = {}) {
	const workflowTaskService = {
		getLatestBuildOutcomeForWorkflow: vi.fn().mockResolvedValue(outcome ?? undefined),
		recordVerification: vi.fn(
			async (_workItemId: string, verification: { claim: unknown }) =>
				await Promise.resolve(verification.claim),
		),
	};
	const context = {
		userId: 'user-1',
		runId: 'run-2',
		workflowService: {
			getWorkflowHead: vi
				.fn()
				.mockResolvedValue({ versionId: 'version-2', activeVersionId: null, updatedAt: 0 }),
		},
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		workflowBuildContext: {
			threadId: 'thread-1',
			runId: 'run-2',
			taskId: 'task_1',
			workItemId: 'wi_1',
			workflowTaskService,
		},
	} as unknown as InstanceAiContext;
	return { context, workflowTaskService };
}

describe('recordLiveRunVerification', () => {
	it('records a verified claim for the executed version when the run covers every planned node', async () => {
		const { context, workflowTaskService } = createContext();

		const claim = await recordLiveRunVerification({
			context,
			workflowId: 'wf_1',
			result: makeRunResult(),
		});

		expect(claim).toMatchObject({
			level: 'verified',
			publishReady: true,
			simulatedNodes: [],
			verifiedVersionId: 'version-2',
			liveState: 'unpublished',
		});
		expect(workflowTaskService.recordVerification).toHaveBeenCalledWith(
			'wi_1',
			expect.objectContaining({
				attempted: true,
				success: true,
				executionId: 'exec-2',
				status: 'success',
				claim: expect.objectContaining({ level: 'verified' }),
				evidence: expect.objectContaining({
					nodesExecuted: ['Every Morning', 'Send Telegram Message'],
				}),
			}),
		);
	});

	it.each([
		['used injected trigger input', { injectedTriggerNodeName: 'Every Morning' }],
		['read saved pinned data', { workflowPinnedNodeNames: ['Send Telegram Message'] }],
		[
			'did not reach a planned node',
			{ executedNodeNames: ['Every Morning'], data: { 'Every Morning': [{}] } },
		],
		['failed', { status: 'error' as const, error: 'Bad Request: chat not found' }],
		[
			'reported a node error',
			{ nodeErrors: [{ nodeName: 'Send Telegram Message', message: 'Bad Request' }] },
		],
	])('keeps the stored claim when the run %s', async (_label, overrides) => {
		const { context, workflowTaskService } = createContext();

		const claim = await recordLiveRunVerification({
			context,
			workflowId: 'wf_1',
			result: makeRunResult(overrides),
		});

		expect(claim).toBeUndefined();
		expect(workflowTaskService.recordVerification).not.toHaveBeenCalled();
	});

	it.each([
		['there is no build outcome', null],
		['the build outcome has no simulation plan', makeOutcome({ nodeSimulationPlan: undefined })],
		[
			'a verification is still running',
			makeOutcome({ verification: { attempted: false, success: false, status: 'running' } }),
		],
	])('does not record when %s', async (_label, outcome) => {
		const { context, workflowTaskService } = createContext({ outcome });

		const claim = await recordLiveRunVerification({
			context,
			workflowId: 'wf_1',
			result: makeRunResult(),
		});

		expect(claim).toBeUndefined();
		expect(workflowTaskService.recordVerification).not.toHaveBeenCalled();
	});

	it('does not record outside a workflow build context', async () => {
		const { context } = createContext();
		context.workflowBuildContext = undefined;

		const claim = await recordLiveRunVerification({
			context,
			workflowId: 'wf_1',
			result: makeRunResult(),
		});

		expect(claim).toBeUndefined();
	});

	it('logs and returns undefined when recording fails', async () => {
		const { context, workflowTaskService } = createContext();
		workflowTaskService.recordVerification.mockRejectedValueOnce(new Error('storage down'));

		const claim = await recordLiveRunVerification({
			context,
			workflowId: 'wf_1',
			result: makeRunResult(),
		});

		expect(claim).toBeUndefined();
		expect(context.logger.warn).toHaveBeenCalledWith(
			'Failed to record a live run as verification evidence',
			{ workflowId: 'wf_1', error: 'storage down' },
		);
	});
});
