import type { OrchestrationContext, PlanStorage } from '../../../types';
import { createCorrectBackgroundTaskTool } from '../correct-background-task.tool';

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model',
		postgresUrl: 'postgresql://test:test@localhost:5432/test',
		subAgentMaxSteps: 5,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
		},
		domainTools: {} as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		planStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as PlanStorage,
		...overrides,
	};
}

describe('createCorrectBackgroundTaskTool', () => {
	it('sends correction to the task when sendCorrectionToTask is available', async () => {
		const sendCorrectionToTask = jest.fn();
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
});
