import type { OrchestrationContext, TaskStorage } from '../../../types';
import type { WorkflowLoopAction } from '../../../workflow-loop/workflow-loop-state';
import { createReportVerificationVerdictTool } from '../report-verification-verdict.tool';

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model',
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		eventBus: {
			publish: jest.fn(),
		},
		domainTools: {} as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as TaskStorage,
		planStorage: {
			get: jest.fn(),
			save: jest.fn(),
		},
		...overrides,
	};
}

const baseInput = {
	workItemId: 'wi_test1234',
	workflowId: 'wf-123',
	verdict: 'verified' as const,
	summary: 'Workflow ran successfully',
};

describe('report-verification-verdict tool', () => {
	it('returns error when reportVerificationVerdict callback is not available', async () => {
		const context = createMockContext({ reportVerificationVerdict: undefined });
		const tool = createReportVerificationVerdictTool(context);

		const result = await tool.execute!(baseInput, {} as never);

		expect((result as { guidance: string }).guidance).toContain('Error');
	});

	it('returns done guidance when verdict is verified', async () => {
		const doneAction: WorkflowLoopAction = {
			type: 'done',
			workflowId: 'wf-123',
			summary: 'All good',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(doneAction);
		const context = createMockContext({ reportVerificationVerdict });
		const tool = createReportVerificationVerdictTool(context);

		const result = await tool.execute!(baseInput, {} as never);

		expect(reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				workItemId: 'wi_test1234',
				workflowId: 'wf-123',
				verdict: 'verified',
			}),
		);
		expect((result as { guidance: string }).guidance).toContain('verified successfully');
		expect((result as { guidance: string }).guidance).toContain('wf-123');
	});

	it('returns verify guidance when action is verify', async () => {
		const verifyAction: WorkflowLoopAction = { type: 'verify', workflowId: 'wf-123' };
		const reportVerificationVerdict = jest.fn().mockResolvedValue(verifyAction);
		const context = createMockContext({ reportVerificationVerdict });
		const tool = createReportVerificationVerdictTool(context);

		const result = await tool.execute!(baseInput, {} as never);

		expect((result as { guidance: string }).guidance).toContain('VERIFY');
		expect((result as { guidance: string }).guidance).toContain('run-workflow');
	});

	it('returns patch guidance when action is patch', async () => {
		const patchAction: WorkflowLoopAction = {
			type: 'patch',
			workflowId: 'wf-123',
			nodeName: 'HTTP Request',
			patch: { url: 'https://example.com' },
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(patchAction);
		const context = createMockContext({ reportVerificationVerdict });
		const tool = createReportVerificationVerdictTool(context);

		const result = await tool.execute!(
			{
				...baseInput,
				verdict: 'needs_patch',
				failedNodeName: 'HTTP Request',
				patch: { url: 'https://example.com' },
			},
			{} as never,
		);

		expect((result as { guidance: string }).guidance).toContain('PATCH NEEDED');
		expect((result as { guidance: string }).guidance).toContain('HTTP Request');
	});

	it('returns rebuild guidance when action is rebuild', async () => {
		const rebuildAction: WorkflowLoopAction = {
			type: 'rebuild',
			workflowId: 'wf-123',
			failureDetails: 'Missing connection between nodes',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(rebuildAction);
		const context = createMockContext({ reportVerificationVerdict });
		const tool = createReportVerificationVerdictTool(context);

		const result = await tool.execute!(
			{ ...baseInput, verdict: 'needs_rebuild', diagnosis: 'Missing connection between nodes' },
			{} as never,
		);

		expect((result as { guidance: string }).guidance).toContain('REBUILD NEEDED');
		expect((result as { guidance: string }).guidance).toContain('build-workflow-with-agent');
	});

	it('returns failed guidance when action is failed', async () => {
		const failedAction: WorkflowLoopAction = {
			type: 'failed',
			workflowId: 'wf-123',
			reason: 'Verification failed after 3 attempts',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(failedAction);
		const context = createMockContext({ reportVerificationVerdict });
		const tool = createReportVerificationVerdictTool(context);

		const result = await tool.execute!(
			{ ...baseInput, verdict: 'failed_terminal', failureSignature: 'TypeError' },
			{} as never,
		);

		expect((result as { guidance: string }).guidance).toContain('Verification failed');
		expect((result as { guidance: string }).guidance).toContain('stop retrying');
	});

	it('passes all optional fields to the callback', async () => {
		const doneAction: WorkflowLoopAction = {
			type: 'done',
			workflowId: 'wf-123',
			summary: 'OK',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(doneAction);
		const context = createMockContext({ reportVerificationVerdict });
		const tool = createReportVerificationVerdictTool(context);

		await tool.execute!(
			{
				...baseInput,
				executionId: 'exec-456',
				failureSignature: 'TypeError:null',
				failedNodeName: 'Code',
				diagnosis: 'Null reference',
				patch: { code: 'fixed' },
			},
			{} as never,
		);

		expect(reportVerificationVerdict).toHaveBeenCalledWith({
			workItemId: 'wi_test1234',
			workflowId: 'wf-123',
			executionId: 'exec-456',
			verdict: 'verified',
			failureSignature: 'TypeError:null',
			failedNodeName: 'Code',
			diagnosis: 'Null reference',
			patch: { code: 'fixed' },
			summary: 'Workflow ran successfully',
		});
	});
});
