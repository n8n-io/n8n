// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));

import { renderHandoff, type SubAgentHandoff } from '../../../agent/handoff';
import type { SubmitWorkflowAttempt } from '../../workflows/submit-workflow.tool';

const { resultFromPostStreamError, builderRenderers, recordSuccessfulWorkflowBuilds } =
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
			taskId: 'task_test',
			startTime: Date.now(),
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			kind: 'build-workflow',
			status: 'completed',
			payload: {
				workItemId: 'wi_test',
				taskId: 'task_test',
				workflowId: 'WF_123',
				submitted: true,
			},
		});
		expect(result!.text).toContain('Unauthorized');
	});

	it('returns undefined when no submit happened before the error', () => {
		const result = resultFromPostStreamError({
			error: new Error('Unauthorized'),
			submitAttempts: [],
			mainWorkflowPath: MAIN_PATH,
			workItemId: 'wi_test',
			taskId: 'task_test',
			startTime: Date.now(),
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
			taskId: 'task_test',
			startTime: Date.now(),
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
			taskId: 'task_test',
			startTime: Date.now(),
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
			taskId: 'task_test',
			startTime: Date.now(),
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			kind: 'build-workflow',
			status: 'completed',
			payload: {
				workflowId: 'WF_123',
				submitted: true,
			},
		});
	});
});

describe('builderRenderers', () => {
	function makeHandoff(
		input: Partial<Extract<SubAgentHandoff, { kind: 'build-workflow' }>['input']> = {},
	): Extract<SubAgentHandoff, { kind: 'build-workflow' }> {
		return {
			taskKey: 'build:new',
			kind: 'build-workflow',
			input: {
				goal: 'Send a weekly report',
				workItemId: 'wi_abc',
				sandboxMode: true,
				...input,
			},
		};
	}

	describe('buildArtifacts', () => {
		it('emits availableCredentials and snapshot timestamp when provided', () => {
			const snapshotAt = '2026-04-21T10:00:00.000Z';
			const handoff = makeHandoff({
				availableCredentials: [
					{ id: 'cred_1', name: 'OpenAI account', type: 'openAiApi' },
					{ id: 'cred_2', name: 'Slack account', type: 'slackApi' },
				],
				credentialsSnapshotAt: snapshotAt,
			});

			const artifacts = builderRenderers.buildArtifacts?.(handoff);

			expect(artifacts).toEqual({
				availableCredentials: [
					{ id: 'cred_1', name: 'OpenAI account', type: 'openAiApi' },
					{ id: 'cred_2', name: 'Slack account', type: 'slackApi' },
				],
				credentialsSnapshotAt: snapshotAt,
			});
		});

		it('omits the snapshot timestamp when credentials are present without a captured-at value', () => {
			const handoff = makeHandoff({
				availableCredentials: [{ id: 'cred_1', name: 'OpenAI', type: 'openAiApi' }],
			});

			const artifacts = builderRenderers.buildArtifacts?.(handoff);

			expect(artifacts).toEqual({
				availableCredentials: [{ id: 'cred_1', name: 'OpenAI', type: 'openAiApi' }],
			});
			expect(artifacts).not.toHaveProperty('credentialsSnapshotAt');
		});

		it('returns undefined when the snapshot is missing', () => {
			const handoff = makeHandoff();
			expect(builderRenderers.buildArtifacts?.(handoff)).toBeUndefined();
		});

		it('returns undefined when the snapshot is explicitly empty', () => {
			const handoff = makeHandoff({ availableCredentials: [] });
			expect(builderRenderers.buildArtifacts?.(handoff)).toBeUndefined();
		});
	});

	describe('renderHandoff composition', () => {
		it('embeds the credentials snapshot inside the <artifacts> block', async () => {
			const handoff = makeHandoff({
				availableCredentials: [{ id: 'cred_1', name: 'OpenAI account', type: 'openAiApi' }],
				credentialsSnapshotAt: '2026-04-21T10:00:00.000Z',
			});

			const briefing = await renderHandoff(handoff, { threadId: 'thread_1' }, builderRenderers);

			expect(briefing).toContain('<artifacts>');
			expect(briefing).toContain('"availableCredentials"');
			expect(briefing).toContain('"openAiApi"');
			expect(briefing).toContain('"credentialsSnapshotAt":"2026-04-21T10:00:00.000Z"');
		});

		it('omits the <artifacts> block when no credentials snapshot is provided', async () => {
			const handoff = makeHandoff();

			const briefing = await renderHandoff(handoff, { threadId: 'thread_1' }, builderRenderers);

			expect(briefing).not.toContain('<artifacts>');
			expect(briefing).not.toContain('availableCredentials');
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
