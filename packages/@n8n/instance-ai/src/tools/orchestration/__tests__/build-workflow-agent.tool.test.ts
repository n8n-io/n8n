// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));

import { createRemediation } from '../../../workflow-loop';
import type { WorkflowBuildOutcome, WorkflowLoopState } from '../../../workflow-loop';
import type { SubmitWorkflowAttempt } from '../../workflows/submit-workflow.tool';

const { recordSuccessfulWorkflowBuilds, resultFromPostStreamError, withTerminalLoopState } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../build-workflow-agent.tool') as typeof import('../build-workflow-agent.tool');

const MAIN_PATH = '/home/daytona/workspace/src/workflow.ts';

describe('resultFromPostStreamError', () => {
	it('preserves the submitted workflow when the stream errors after a successful submit', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: true,
				workflowId: 'WF_123',
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workItemId: 'wi_test',
			taskId: 'task_test',
			workflowId: 'WF_123',
			submitted: true,
		});
		expect(result!.text).toContain('Unauthorized');
	});

	it('returns undefined when no submit happened before the error', () => {
		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts: [],
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when the only submit attempt failed', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: false,
				errors: ['validation failed'],
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when only sub-workflows were submitted (not the main path)', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: '/home/daytona/workspace/src/subworkflow.ts',
				sourceHash: 'abc',
				success: true,
				workflowId: 'SUB_123',
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeUndefined();
	});

	it('preserves an earlier successful main-path submit when a later submit failed', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'a',
				success: true,
				workflowId: 'WF_123',
			},
			{
				filePath: MAIN_PATH,
				sourceHash: 'b',
				success: false,
				errors: ['validation failed'],
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_123',
			submitted: true,
		});
	});

	it('marks unresolved placeholder submits as saved workflows needing setup', () => {
		const submitAttempts: SubmitWorkflowAttempt[] = [
			{
				filePath: MAIN_PATH,
				sourceHash: 'abc',
				success: true,
				workflowId: 'WF_123',
				hasUnresolvedPlaceholders: true,
			},
		];

		const result = resultFromPostStreamError({
			error: new Error('Stopped after submit'),
			submitAttempts,
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
		});

		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_123',
			submitted: true,
			needsUserInput: true,
			blockingReason:
				'Workflow submitted successfully, but unresolved setup values remain. Stop code edits and route to workflows(action="setup").',
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
			},
		});
	});
});

describe('withTerminalLoopState', () => {
	it('marks a saved workflow as needing user input when verification is blocked by setup', () => {
		const outcome: WorkflowBuildOutcome = {
			workItemId: 'wi_test',
			runId: 'run_test',
			taskId: 'task_test',
			workflowId: 'wf_123',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			summary: 'Submitted workflow.',
		};
		const state: WorkflowLoopState = {
			workItemId: 'wi_test',
			threadId: 'thread_1',
			runId: 'run_test',
			workflowId: 'wf_123',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: 0,
			lastRemediation: createRemediation({
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
				guidance: 'Route to setup.',
			}),
		};

		expect(withTerminalLoopState(outcome, state)).toMatchObject({
			submitted: true,
			workflowId: 'wf_123',
			needsUserInput: true,
			blockingReason: 'Route to setup.',
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
			},
		});
	});
});

describe('recordSuccessfulWorkflowBuilds', () => {
	it('records workflow IDs returned from successful build-workflow executions', async () => {
		const onWorkflowId = jest.fn();
		const input = { prompt: 'build it' };
		const context = { runId: 'run-1' };
		const result = { success: true, workflowId: 'wf-main', displayName: 'Main' };
		const execute = jest.fn(
			async (_input: unknown, _context?: unknown) => await Promise.resolve(result),
		);
		const tool = { execute };

		recordSuccessfulWorkflowBuilds(tool, onWorkflowId);

		await expect(tool.execute(input, context)).resolves.toBe(result);
		expect(execute).toHaveBeenCalledWith(input, context);
		expect(onWorkflowId).toHaveBeenCalledWith('wf-main');
	});

	it('does not record failed or incomplete build-workflow results', async () => {
		const onWorkflowId = jest.fn();
		const execute = jest
			.fn()
			.mockResolvedValueOnce({ success: false, workflowId: 'wf-failed' })
			.mockResolvedValueOnce({ success: true });
		const tool = { execute };

		recordSuccessfulWorkflowBuilds(tool, onWorkflowId);

		await tool.execute({});
		await tool.execute({});
		expect(onWorkflowId).not.toHaveBeenCalled();
	});
});
