// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));

import type { SubmitWorkflowAttempt } from '../../workflows/submit-workflow.tool';

const { resultFromPostStreamError } =
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
			taskId: 'task_test',
		});

		expect(result).toBeDefined();
		expect(result!.outcome).toMatchObject({
			workflowId: 'WF_123',
			submitted: true,
		});
	});
});
