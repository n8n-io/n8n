import type { OrchestrationContext, TaskStorage } from '../../../types';
import type { WorkflowLoopAction } from '../../../workflow-loop/workflow-loop-state';
import { createReportVerificationVerdictTool } from '../report-verification-verdict.tool';

function createWorkflowTaskService(reportVerificationVerdict = jest.fn()) {
	return {
		reportBuildOutcome: jest.fn(),
		reportVerificationVerdict,
		getBuildOutcome: jest.fn(),
		getWorkflowLoopState: jest.fn(),
		updateBuildOutcome: jest.fn(),
	};
}

function createReportVerificationVerdictMock(action: WorkflowLoopAction) {
	const reportVerificationVerdict = jest.fn<Promise<WorkflowLoopAction>, [unknown]>();
	reportVerificationVerdict.mockResolvedValue(action);
	return reportVerificationVerdict;
}

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
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
			getEventsForRuns: jest.fn().mockReturnValue([]),
		},
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools: {} as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as TaskStorage,
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
		const context = createMockContext({ workflowTaskService: undefined });
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(baseInput, {} as never)) as Record<string, unknown>;

		expect((result as { guidance: string }).guidance).toContain('Error');
	});

	it('returns done guidance when verdict is verified', async () => {
		const doneAction: WorkflowLoopAction = {
			type: 'done',
			workflowId: 'wf-123',
			summary: 'All good',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(doneAction);
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(baseInput, {} as never)) as Record<string, unknown>;

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
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(baseInput, {} as never)) as Record<string, unknown>;

		expect((result as { guidance: string }).guidance).toContain('VERIFY');
		expect((result as { guidance: string }).guidance).toContain('executions(action="run")');
	});

	it('returns patch guidance when needs_patch produces patch action', async () => {
		const patchAction: WorkflowLoopAction = {
			type: 'patch',
			workflowId: 'wf-123',
			failedNodeName: 'HTTP Request',
			diagnosis: 'Invalid URL',
			patch: { url: 'https://example.com' },
		};
		const reportVerificationVerdict = createReportVerificationVerdictMock(patchAction);
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(
			{
				...baseInput,
				verdict: 'needs_patch',
				failedNodeName: 'HTTP Request',
				patch: { url: 'https://example.com' },
			},
			{} as never,
		)) as Record<string, unknown>;

		const reported = reportVerificationVerdict.mock.calls[0]?.[0] as {
			remediation?: { category?: string; shouldEdit?: boolean };
		};
		expect(reported.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
		});
		expect((result as { guidance: string }).guidance).toContain('PATCH NEEDED');
		expect((result as { guidance: string }).guidance).toContain('workItemId');
		expect((result as { guidance: string }).guidance).toContain('patch');
	});

	it('preserves specific failure signatures for code-fixable remediation', async () => {
		const reportVerificationVerdict = createReportVerificationVerdictMock({
			type: 'patch',
			workflowId: 'wf-123',
			failedNodeName: 'HTTP Request',
			diagnosis: 'Invalid URL',
		});
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		await tool.execute!(
			{
				...baseInput,
				verdict: 'needs_patch',
				failureSignature: 'http-request:invalid-url',
				failedNodeName: 'HTTP Request',
				remediation: {
					category: 'code_fixable',
					shouldEdit: true,
					reason: 'runtime_failure',
					guidance: 'Fix code.',
				},
			},
			{} as never,
		);

		const reported = reportVerificationVerdict.mock.calls[0]?.[0] as {
			verdict?: string;
			failureSignature?: string;
			remediation?: { reason?: string };
		};
		expect(reported).toMatchObject({
			verdict: 'needs_patch',
			failureSignature: 'http-request:invalid-url',
		});
		expect(reported.remediation).toMatchObject({ reason: 'runtime_failure' });
	});

	it('refuses repair verdict when persisted remediation is terminal', async () => {
		const reportVerificationVerdict = jest.fn();
		const workflowTaskService = createWorkflowTaskService(reportVerificationVerdict);
		workflowTaskService.getWorkflowLoopState.mockResolvedValue({
			workItemId: 'wi_test1234',
			threadId: 'test-thread',
			runId: 'test-run',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			lastRemediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'post_submit_budget_exhausted',
				guidance: 'Stop editing.',
			},
		});
		const context = createMockContext({ workflowTaskService });
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(
			{
				...baseInput,
				verdict: 'needs_patch',
				failedNodeName: 'HTTP Request',
			},
			{} as never,
		)) as { guidance: string };

		expect(reportVerificationVerdict).not.toHaveBeenCalled();
		expect(result.guidance).toContain('Stop editing');
	});

	it('ignores terminal remediation from a previous run', async () => {
		const reportVerificationVerdict = createReportVerificationVerdictMock({
			type: 'patch',
			workflowId: 'wf-123',
			failedNodeName: 'HTTP Request',
			diagnosis: 'Fix URL',
		});
		const workflowTaskService = createWorkflowTaskService(reportVerificationVerdict);
		workflowTaskService.getWorkflowLoopState.mockResolvedValue({
			workItemId: 'wi_test1234',
			threadId: 'test-thread',
			runId: 'previous-run',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			lastRemediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
				guidance: 'Route to setup.',
			},
		});
		const context = createMockContext({ workflowTaskService });
		const tool = createReportVerificationVerdictTool(context);

		await tool.execute!(
			{
				...baseInput,
				verdict: 'needs_patch',
				failedNodeName: 'HTTP Request',
				diagnosis: 'Fix URL',
			},
			{} as never,
		);

		expect(reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'needs_patch',
				failedNodeName: 'HTTP Request',
			}),
		);
	});

	it('converts non-editable remediation into a terminal verdict', async () => {
		const reportVerificationVerdict = jest.fn().mockResolvedValue({
			type: 'blocked',
			reason: 'Route to setup.',
		} satisfies WorkflowLoopAction);
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		await tool.execute!(
			{
				...baseInput,
				verdict: 'needs_patch',
				failedNodeName: 'HTTP Request',
				remediation: {
					category: 'needs_setup',
					shouldEdit: false,
					reason: 'mocked_credentials_or_placeholders',
					guidance: 'Route to setup.',
				},
			},
			{} as never,
		);

		expect(reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'needs_user_input',
				failedNodeName: undefined,
				patch: undefined,
			}),
		);
	});

	it('returns rebuild guidance when action is rebuild', async () => {
		const rebuildAction: WorkflowLoopAction = {
			type: 'rebuild',
			workflowId: 'wf-123',
			failureDetails: 'Missing connection between nodes',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(rebuildAction);
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(
			{ ...baseInput, verdict: 'needs_rebuild', diagnosis: 'Missing connection between nodes' },
			{} as never,
		)) as Record<string, unknown>;

		expect((result as { guidance: string }).guidance).toContain('REBUILD NEEDED');
		expect((result as { guidance: string }).guidance).toContain('build-workflow-with-agent');
		expect((result as { guidance: string }).guidance).toContain('workflowId: "wf-123"');
	});

	it('returns blocked guidance when action is blocked', async () => {
		const blockedAction: WorkflowLoopAction = {
			type: 'blocked',
			reason: 'Repeated patch failure: TypeError',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(blockedAction);
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		const result = (await tool.execute!(
			{ ...baseInput, verdict: 'failed_terminal', failureSignature: 'TypeError' },
			{} as never,
		)) as Record<string, unknown>;

		expect((result as { guidance: string }).guidance).toContain('BUILD BLOCKED');
		expect((result as { guidance: string }).guidance).toContain('Repeated patch failure');
	});

	it('passes all optional fields to the callback', async () => {
		const doneAction: WorkflowLoopAction = {
			type: 'done',
			workflowId: 'wf-123',
			summary: 'OK',
		};
		const reportVerificationVerdict = jest.fn().mockResolvedValue(doneAction);
		const context = createMockContext({
			workflowTaskService: createWorkflowTaskService(reportVerificationVerdict),
		});
		const tool = createReportVerificationVerdictTool(context);

		(await tool.execute!(
			{
				...baseInput,
				executionId: 'exec-456',
				failureSignature: 'TypeError:null',
				failedNodeName: 'Code',
				diagnosis: 'Null reference',
				patch: { code: 'fixed' },
			},
			{} as never,
		)) as Record<string, unknown>;

		expect(reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				workItemId: 'wi_test1234',
				runId: 'test-run',
				workflowId: 'wf-123',
				executionId: 'exec-456',
				verdict: 'verified',
				failureSignature: 'TypeError:null',
				failedNodeName: 'Code',
				diagnosis: 'Null reference',
				patch: { code: 'fixed' },
				summary: 'Workflow ran successfully',
			}),
		);
	});
});
