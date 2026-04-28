import type { OrchestrationContext } from '../../../types';
import { createRemediation } from '../../../workflow-loop/remediation';
import { createVerifyBuiltWorkflowTool } from '../verify-built-workflow.tool';

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

type Executable = {
	execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function createContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	const workflowTaskService = {
		reportBuildOutcome: jest.fn(),
		reportVerificationVerdict: jest.fn(),
		getBuildOutcome: jest.fn().mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			summary: 'Built',
		}),
		getWorkflowLoopState: jest.fn(),
		updateBuildOutcome: jest.fn(),
	};

	return {
		threadId: 'thread_1',
		runId: 'run_1',
		userId: 'user_1',
		orchestratorAgentId: 'agent_1',
		modelId: 'test-model',
		storage: {} as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		eventBus: {} as OrchestrationContext['eventBus'],
		logger: {} as OrchestrationContext['logger'],
		domainTools: {},
		abortSignal: new AbortController().signal,
		taskStorage: {} as OrchestrationContext['taskStorage'],
		workflowTaskService,
		domainContext: {
			userId: 'user_1',
			workflowService: {} as never,
			executionService: {
				run: jest.fn().mockResolvedValue({
					executionId: 'exec_1',
					status: 'success',
				}),
			},
			credentialService: {} as never,
			nodeService: {} as never,
			dataTableService: {} as never,
		},
		...overrides,
	} as OrchestrationContext;
}

describe('verify-built-workflow tool', () => {
	it('routes mocked-credential verification failures to setup and records terminal verdict', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			mockedCredentialTypes: ['gmailOAuth2'],
			mockedNodeNames: ['Gmail'],
			summary: 'Built',
		});
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Gmail credentials are mocked',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'needs_user_input',
			}),
		);
		const reported = jest.mocked(context.workflowTaskService!.reportVerificationVerdict).mock
			.calls[0]?.[0] as { remediation?: { category?: string } };
		expect(reported.remediation).toMatchObject({ category: 'needs_setup' });
	});

	it('does not execute or report another verdict when the persisted guard is terminal', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
			workItemId: 'wi_1',
			threadId: 'thread_1',
			runId: 'run_1',
			workflowId: 'wf_1',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			lastRemediation: createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: 'post_submit_budget_exhausted',
				guidance: 'Stop editing.',
			}),
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });
		const repeatedResult = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({ reason: 'post_submit_budget_exhausted' });
		expect(repeatedResult.success).toBe(false);
		expect(repeatedResult.remediation).toMatchObject({
			reason: 'post_submit_budget_exhausted',
		});
		expect(context.domainContext!.executionService.run).not.toHaveBeenCalled();
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('still verifies the second allowed post-submit repair before blocking further edits', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
			workItemId: 'wi_1',
			threadId: 'thread_1',
			runId: 'run_1',
			workflowId: 'wf_1',
			phase: 'verifying',
			status: 'active',
			source: 'create',
			rebuildAttempts: 2,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: 2,
			lastRemediation: createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'runtime_failure',
				guidance: 'Verify the latest repair.',
			}),
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(true);
		expect(context.domainContext!.executionService.run).toHaveBeenCalled();
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('returns editable remediation for generic runtime failures without terminal reporting', async () => {
		const context = createContext();
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Node parameter value is invalid',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});
});
