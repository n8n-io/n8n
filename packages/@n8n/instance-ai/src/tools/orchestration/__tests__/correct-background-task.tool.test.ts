import type { OrchestrationContext, TaskStorage } from '../../../types';
import { createCorrectBackgroundTaskTool } from '../correct-background-task.tool';

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
		domainTools: {} as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as TaskStorage,
		...overrides,
	};
}

describe('createCorrectBackgroundTaskTool', () => {
	it('sends correction to the task when sendCorrectionToTask is available', async () => {
		const sendCorrectionToTask = jest.fn().mockReturnValue('queued');
		const context = createMockContext({ sendCorrectionToTask });
		const tool = createCorrectBackgroundTaskTool(context);

		const result = await tool.execute!(
			{ taskId: 'build-abc123', correction: 'Use the Projects database' },
			{} as never,
		);

		expect(sendCorrectionToTask).toHaveBeenCalledWith('build-abc123', 'Use the Projects database');
		expect((result as { result: string }).result).toContain('Correction sent');
	});

	it('returns error when sendCorrectionToTask is not available', async () => {
		const context = createMockContext({ sendCorrectionToTask: undefined });
		const tool = createCorrectBackgroundTaskTool(context);

		const result = await tool.execute!(
			{ taskId: 'build-abc123', correction: 'Use the Projects database' },
			{} as never,
		);

		expect((result as { result: string }).result).toContain('Error');
	});

	it('returns task-completed message when the task has already finished', async () => {
		const sendCorrectionToTask = jest.fn().mockReturnValue('task-completed');
		const context = createMockContext({ sendCorrectionToTask });
		const tool = createCorrectBackgroundTaskTool(context);

		const result = await tool.execute!(
			{ taskId: 'build-abc123', correction: 'Use the Projects database' },
			{} as never,
		);

		expect((result as { result: string }).result).toContain('already completed');
		expect((result as { result: string }).result).toContain('follow-up task');
	});

	it('returns task-not-found message when the task does not exist', async () => {
		const sendCorrectionToTask = jest.fn().mockReturnValue('task-not-found');
		const context = createMockContext({ sendCorrectionToTask });
		const tool = createCorrectBackgroundTaskTool(context);

		const result = await tool.execute!(
			{ taskId: 'build-unknown', correction: 'Use the Projects database' },
			{} as never,
		);

		expect((result as { result: string }).result).toContain('not found');
	});
});
