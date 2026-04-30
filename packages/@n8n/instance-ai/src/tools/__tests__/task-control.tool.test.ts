import type { OrchestrationContext } from '../../types';
import { createTaskControlTool } from '../task-control.tool';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		userId: 'user-1',
		orchestratorAgentId: 'orchestrator-1',
		modelId: 'test-model',
		storage: {} as never,
		subAgentMaxSteps: 10,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
		},
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as never,
		domainTools: {},
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		},
		cancelBackgroundTask: jest.fn(),
		sendCorrectionToTask: jest.fn(),
		...overrides,
	} as unknown as OrchestrationContext;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('task-control tool', () => {
	// ── update-checklist ────────────────────────────────────────────────────

	describe('update-checklist action', () => {
		it('should save tasks to taskStorage and publish event', async () => {
			const context = createMockContext();
			const tasks = [
				{ id: 'task-1', description: 'Build workflow', status: 'in_progress' as const },
				{ id: 'task-2', description: 'Test workflow', status: 'todo' as const },
			];

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{ action: 'update-checklist' as const, tasks },
				{} as never,
			);

			expect(context.taskStorage.save).toHaveBeenCalledWith('thread-1', { tasks });
			expect(context.eventBus.publish).toHaveBeenCalledWith('thread-1', {
				type: 'tasks-update',
				runId: 'run-1',
				agentId: 'orchestrator-1',
				payload: { tasks: { tasks } },
			});
			expect(result).toEqual({ saved: true });
		});

		it('should handle empty tasks list', async () => {
			const context = createMockContext();

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{ action: 'update-checklist' as const, tasks: [] },
				{} as never,
			);

			expect(context.taskStorage.save).toHaveBeenCalledWith('thread-1', { tasks: [] });
			expect(context.eventBus.publish).toHaveBeenCalled();
			expect(result).toEqual({ saved: true });
		});
	});

	// ── cancel-task ────────────────────────────────────────────────────────

	describe('cancel-task action', () => {
		it('should call cancelBackgroundTask and return success message', async () => {
			const context = createMockContext();

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{ action: 'cancel-task' as const, taskId: 'build-ABC123' },
				{} as never,
			);

			expect(context.cancelBackgroundTask).toHaveBeenCalledWith('build-ABC123');
			expect(result).toEqual({ result: 'Background task build-ABC123 cancelled.' });
		});

		it('should return error when cancelBackgroundTask is not available', async () => {
			const context = createMockContext({
				cancelBackgroundTask: undefined,
			});

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{ action: 'cancel-task' as const, taskId: 'build-XYZ' },
				{} as never,
			);

			expect(result).toEqual({
				result: 'Error: background task cancellation not available.',
			});
		});
	});

	// ── correct-task ───────────────────────────────────────────────────────

	describe('correct-task action', () => {
		it('should send correction and return success message', async () => {
			const context = createMockContext();
			(context.sendCorrectionToTask as jest.Mock).mockReturnValue('queued');

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{
					action: 'correct-task' as const,
					taskId: 'build-ABC',
					correction: 'use the Projects database',
				},
				{} as never,
			);

			expect(context.sendCorrectionToTask).toHaveBeenCalledWith(
				'build-ABC',
				'use the Projects database',
			);
			expect(result).toEqual({
				result:
					'Correction sent to task build-ABC: "use the Projects database". ' +
					'The builder will see this on its next step.',
			});
		});

		it('should return task-not-found message when task does not exist', async () => {
			const context = createMockContext();
			(context.sendCorrectionToTask as jest.Mock).mockReturnValue('task-not-found');

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{
					action: 'correct-task' as const,
					taskId: 'build-GONE',
					correction: 'fix the trigger',
				},
				{} as never,
			);

			expect(result).toEqual({
				result: 'Task build-GONE not found. It may have already been cleaned up.',
			});
		});

		it('should return task-completed message when task has finished', async () => {
			const context = createMockContext();
			(context.sendCorrectionToTask as jest.Mock).mockReturnValue('task-completed');

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{
					action: 'correct-task' as const,
					taskId: 'build-DONE',
					correction: 'add error handling',
				},
				{} as never,
			);

			expect(result).toEqual({
				result:
					'Task build-DONE has already completed. The correction was not delivered. ' +
					'Incorporate "add error handling" into a new follow-up task instead.',
			});
		});

		it('should return error when sendCorrectionToTask is not available', async () => {
			const context = createMockContext({
				sendCorrectionToTask: undefined,
			});

			const tool = createTaskControlTool(context);
			const result = await tool.execute!(
				{
					action: 'correct-task' as const,
					taskId: 'build-ABC',
					correction: 'fix it',
				},
				{} as never,
			);

			expect(result).toEqual({
				result: 'Error: correction delivery not available.',
			});
		});
	});
});
